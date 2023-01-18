import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import { BaseInfra } from "../lib/base-infra";
import environmentConfig, { IEnvironmentConfig } from "../util/environment-config";

interface AuroraStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
  lambdaSecurityGroup: cdk.aws_ec2.SecurityGroup;
}

export class AuroraStack extends cdk.Stack {
  public readonly clusterSecurityGroup: cdk.aws_ec2.SecurityGroup;
  public readonly dbCluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraStackProps) {
    super(scope, id, props);

    const { stage, lambdaSecurityGroup } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);

    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const privateSubnets = baseInfra.privateSubnets

    const clusterUser = "clusteradmin";
    const credentials = rds.Credentials.fromGeneratedSecret(clusterUser);
    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_14_3,
    });
    const rdsParamGroup = new rds.ParameterGroup(this, "SlowQueryParamsGrp", {
      engine,
      description:
        "Aurora PostgreSQL Cluster Parameter Group with Slow Query Logging",
      parameters: {
        log_min_duration_statement: "1500",
      },
    });

    const clusterSecurityGroup = new ec2.SecurityGroup(
      this,
      "AuroraClusterSG",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for aurora cluster",
        securityGroupName: "AuroraClusterSG",
      }
    );

    const cluster = new rds.DatabaseCluster(this, "Database", {
      engine,
      credentials,
      storageEncrypted: true,
      cloudwatchLogsExports: ["postgresql"],
      cloudwatchLogsRetention: logs.RetentionDays.THREE_DAYS,
      parameterGroup: rdsParamGroup,
      deletionProtection: stage === "production",
      instances: stage === "production" ? 3 : 2,
      instanceProps: {
        vpc,
        vpcSubnets: {
          subnets: privateSubnets
        },
        autoMinorVersionUpgrade: true,
        publiclyAccessible: false,
        securityGroups: [clusterSecurityGroup],
        instanceType: new ec2.InstanceType('serverless'),
      },
    });

    // escape hatch to finish setup aurora serverless v2
    const clusterCfnConfig = cluster.node.findChild("Resource") as rds.CfnDBCluster
    
    clusterCfnConfig.serverlessV2ScalingConfiguration = {
      minCapacity: 0.5,
      maxCapacity: 4
    }

    const proxy = cluster.addProxy(`${id}-rds-proxy`, {
      secrets: [cluster.secret!],
      debugLogging: true,
      vpc,
      vpcSubnets: {
        subnets: privateSubnets
      },
      securityGroups: [clusterSecurityGroup],
      iamAuth: true,
    });

    const role = new iam.Role(this, "DBProxyRole", {
      assumedBy: new iam.AccountPrincipal(this.account),
    });

    if (stage === "dev" && !!envConfig.vpnSubnetCidr) {
      clusterSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(envConfig.vpnSubnetCidr!),
        ec2.Port.tcp(5432),
        "Allow connection from VPN"
      );
    }

    clusterSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSecurityGroup.securityGroupId),
      ec2.Port.allTraffic(),
      "postgres for Lambda security group"
    );

    proxy.grantConnect(role, "clusteradmin"); // Grant the role connection access to the DB Proxy for database user 'clusteradmin'.

    Tags.of(cluster).add("backup", envConfig.backup! ? "yes" : "no");

    new cdk.CfnOutput(this, "databaseProxyEndpoint", {
      value: proxy.endpoint,
      description: "The proxy endpoint for the aurora cluster",
      exportName: "auroraProxyEndpoint",
    });

    new cdk.CfnOutput(this, "databaseUser", {
      value: clusterUser,
      description: "the username for the aurora cluster",
      exportName: "auroraUser",
    });

    new cdk.CfnOutput(this, "databaseSecretName", {
      value: cluster.secret?.secretName!,
      description: "The secret name for our aurora cluster",
      exportName: "auroraClusterSecretName",
    });

    new cdk.CfnOutput(this, "databaseHostname", {
      value: cluster.clusterEndpoint.hostname,
      description: "The hostname for the aurora cluster",
      exportName: "auroraClusterHostname",
    });

    new cdk.CfnOutput(this, "databasePort", {
      value: cluster.clusterEndpoint.port.toString(),
      description: "The port for the aurora cluster",
      exportName: "auroraClusterPort",
    });

    this.clusterSecurityGroup = clusterSecurityGroup;
    this.dbCluster = cluster;
  }
}
