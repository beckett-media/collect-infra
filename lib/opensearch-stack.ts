import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { AccountRootPrincipal } from "aws-cdk-lib/aws-iam";
import { Domain, EngineVersion } from "aws-cdk-lib/aws-opensearchservice";
import { Construct } from "constructs";
import { BaseInfra } from "../lib/base-infra";
import environmentConfig from "../util/environment-config";

interface OpensearchStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
  bastionSecurityGroup?: cdk.aws_ec2.SecurityGroup;
  lambdaSecurityGroup: cdk.aws_ec2.SecurityGroup;
  siteCertificate: cdk.aws_certificatemanager.Certificate;
}

export class OpensearchStack extends cdk.Stack {
  public readonly opensearchSecurityGroup: cdk.aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: OpensearchStackProps) {
    super(scope, id, props);

    const {
      stage,
      bastionSecurityGroup,
      lambdaSecurityGroup,
      siteCertificate,
    } = props;

    const envConfig = environmentConfig(stage);
    const baseInfra = new BaseInfra(this, "baseInfra", { stage: stage });
    const vpc = baseInfra.vpc;
    const privateSubnets = baseInfra.privateSubnets;
    const hostedZone = baseInfra.hostedZone;
    const SEARCH_DOMAIN = `search.${envConfig.domainName}`;

    const opensearchSecurityGroup = new ec2.SecurityGroup(
      this,
      "OpensearchSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for opensearch domain",
        securityGroupName: "OpensearchSecurityGroup",
      }
    );

    const opensearchDomain = new Domain(this, "Domain", {
      version: EngineVersion.OPENSEARCH_1_3,
      securityGroups: [opensearchSecurityGroup],
      vpcSubnets: [
        {
          subnets: process.env.STAGE === "production" ? privateSubnets : [privateSubnets[0]],
        },
      ],
      capacity: {
        ...(process.env.STAGE === "production"
          ? {
              masterNodes: 3, // 3 or 5 is acceptable, see documentation
              masterNodeInstanceType: "m5.large.search" // to be reviewed and adjusted based on metrics,
            }
          : {}),
        dataNodes: process.env.STAGE === "production" ? 2 : 1,
        dataNodeInstanceType: "i3.large.search",
      },
      ebs: {
        // volumeSize: 100,
        enabled: false,
      },
      vpc,
      zoneAwareness: {
        enabled: process.env.STAGE === "production",
      },
      enableVersionUpgrade: true,
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
      },
      customEndpoint: {
        domainName: SEARCH_DOMAIN,
        certificate: siteCertificate,
        hostedZone: hostedZone,
      },
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
      },
      enforceHttps: true,
    });

    const localOpenSearchIamUser = new iam.User(
      this,
      "localOpenSearchIamUser",
      {
        userName: "localOpenSearch",
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonOpenSearchServiceFullAccess"
          ),
        ],
      }
    );

    const accessKey = new iam.CfnAccessKey(this, "CfnAccessKey", {
      userName: localOpenSearchIamUser.userName,
    });

    new iam.CfnServiceLinkedRole(this, "Service Linked Role", {
      awsServiceName: "es.amazonaws.com",
    });

    opensearchSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSecurityGroup.securityGroupId),
      ec2.Port.allTraffic(),
      "global access to lambda security group"
    );
    bastionSecurityGroup 
      ? opensearchSecurityGroup.addIngressRule(
          ec2.Peer.securityGroupId(bastionSecurityGroup?.securityGroupId),
          ec2.Port.allTraffic(),
          "global access to bastion group"
        ) 
      : null
    if (stage !== "production" && !!envConfig.vpnSubnetCidr) {
      opensearchSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(envConfig.vpnSubnetCidr),
        ec2.Port.allTraffic(),
        "Allow connection from VPN"
      );
    }

    opensearchDomain.addAccessPolicies(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`${opensearchDomain.domainArn}/*`],
        actions: ["es:*"],
        principals: [new AccountRootPrincipal()],
      })
    );

    new cdk.CfnOutput(this, "opensearchEndpoint", {
      value: `${SEARCH_DOMAIN}`,
      description: "The endpoint for the opensearch domain",
      exportName: "opensearchEndpoint",
    });

    new cdk.CfnOutput(this, "localOpenSearchAccessKeyId", {
      value: accessKey.ref,
    });
    new cdk.CfnOutput(this, "localOpenSearchAccessKey", {
      value: accessKey.attrSecretAccessKey,
    });

    this.opensearchSecurityGroup = opensearchSecurityGroup;
  }
}
