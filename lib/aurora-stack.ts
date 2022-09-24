import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface AuroraStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

export class AuroraStack extends cdk.Stack {
  public readonly clusterSecurityGroup: cdk.aws_ec2.SecurityGroup;
  public readonly dbCluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;

    const clusterUser = 'clusteradmin';
    const credentials = rds.Credentials.fromGeneratedSecret(clusterUser);
    const engine = rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_10_21 });
    const rdsParamGroup = new rds.ParameterGroup(this, 'SlowQueryParamsGrp', {
      engine,
      description: 'Aurora PostgreSQL Cluster Parameter Group with Slow Query Logging',
      parameters: {
        log_min_duration_statement: '1500'
      }
    });
    // const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

    const clusterSecurityGroup = new ec2.SecurityGroup(this, 'AuroraClusterSG', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for aurora cluster',
      securityGroupName: 'AuroraClusterSG'
    });

    const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

    const cluster = new rds.DatabaseCluster(this, 'Database', {
      engine,
      credentials,
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.THREE_DAYS,
      parameterGroup: rdsParamGroup,
      deletionProtection: stage === "production",
      instances: 1, // TODO , increase for production
      instanceProps: {
        autoMinorVersionUpgrade: true,
        publiclyAccessible: process.env.STAGE === "dev",
        securityGroups: [clusterSecurityGroup],
        // TODO , defaults to t3.medium - revist for production
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
        vpcSubnets: {
          subnetType: stage === "dev" ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_NAT // SWITCH TO PRIVATE_ISOLATED IF DONT NEED VPC to VPC connectivity
        },
        vpc,
      },
    });

    //

    const proxy = cluster.addProxy(`${id}-rds-proxy`, {
      secrets: [cluster.secret!],
      debugLogging: true,
      vpc,
      securityGroups: [clusterSecurityGroup],
      iamAuth: true
    })

    // Workaround for bug where TargetGroupName is not set but required
    const targetGroup = proxy.node.children.find((child:any) => {
      return child instanceof rds.CfnDBProxyTargetGroup
    }) as rds.CfnDBProxyTargetGroup

    const role = new iam.Role(this, 'DBProxyRole', { assumedBy: new iam.AccountPrincipal(this.account) });

    if(stage === "dev") {
      clusterSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), 'Allow connection from anywhere');
    }

    clusterSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(defaultSecurityGroup.securityGroupId), ec2.Port.allTraffic(), 'postgres for default group');


    targetGroup.addPropertyOverride('TargetGroupName', 'default');

    proxy.grantConnect(role, 'clusteradmin'); // Grant the role connection access to the DB Proxy for database user 'clusteradmin'.

    new cdk.CfnOutput(this, 'databaseProxyEndpoint', {
      value: proxy.endpoint,
      description: 'The proxy endpoint for the aurora cluster',
      exportName: 'auroraProxyEndpoint',
    });

    new cdk.CfnOutput(this, 'databaseUser', {
      value: clusterUser,
      description: 'the username for the aurora cluster',
      exportName: 'auroraUser',
    });

    new cdk.CfnOutput(this, 'databaseSecretName', {
      value: cluster.secret?.secretName!,
      description: 'The secret name for our aurora cluster',
      exportName: 'auroraClusterSecretName',
    });

    new cdk.CfnOutput(this, 'databaseHostname', {
      value: cluster.clusterEndpoint.hostname,
      description: 'The hostname for the aurora cluster',
      exportName: 'auroraClusterHostname',
    });

    new cdk.CfnOutput(this, 'databasePort', {
      value: cluster.clusterEndpoint.port.toString(),
      description: 'The port for the aurora cluster',
      exportName: 'auroraClusterPort',
    });


    this.clusterSecurityGroup = clusterSecurityGroup;
    this.dbCluster = cluster;

  }
}
