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
  bastionSecurityGroup: cdk.aws_ec2.SecurityGroup;
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
          subnets:
            process.env.STAGE === "production"
              ? privateSubnets
              : [privateSubnets[0]],
        },
        // {
        //   subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        // }
      ],
      capacity: {
        ...(process.env.STAGE === "production"
          ? {
              masterNodes: 1,
              masterNodeInstanceType: "i3.large.search",
            }
          : {}),
        dataNodes: process.env.STAGE === "production" ? 2 : 1,
        dataNodeInstanceType: "i3.large.search", //TODO: process.env.STAGE === "production" ? "m5.large.search" : "m5.large.search",
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

    new iam.CfnServiceLinkedRole(this, "Service Linked Role", {
      awsServiceName: "es.amazonaws.com",
    });

    opensearchSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSecurityGroup.securityGroupId),
      ec2.Port.allTraffic(),
      "global access to lambda security group"
    );
    opensearchSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(bastionSecurityGroup.securityGroupId),
      ec2.Port.allTraffic(),
      "global access to bastion group"
    );
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

    this.opensearchSecurityGroup = opensearchSecurityGroup;
  }
}
