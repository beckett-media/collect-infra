import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Construct } from 'constructs';

interface OpensearchStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
  bastionSecurityGroup: cdk.aws_ec2.SecurityGroup;
}

export class OpensearchStack extends cdk.Stack {
  public readonly opensearchSecurityGroup: cdk.aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: OpensearchStackProps) {
    super(scope, id, props);

    const { stage, vpc, bastionSecurityGroup } = props;

    const opensearchSecurityGroup = new ec2.SecurityGroup(this, 'OpensearchSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for opensearch domain',
      securityGroupName: 'OpensearchSecurityGroup'
    });

    const opensearchDomain = new Domain(this, 'Domain', {
      version: EngineVersion.OPENSEARCH_1_3,
      securityGroups: [opensearchSecurityGroup],
      vpcSubnets: [
        {
          subnets: [vpc.privateSubnets[0]]
        },
        // {
        //   subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        // }
      ],
      capacity: {
        // TODO: ...(process.env.STAGE === "production" ? {
        //   masterNodes: 3,
        //   masterNodeInstanceType: "m5.large.search"
        // }: {}),
        dataNodes: process.env.STAGE === "production" ? 4 : 1,
        dataNodeInstanceType: "t3.small.search", //TODO: process.env.STAGE === "production" ? "m5.large.search" : "t3.small.search",
      },
      ebs: {
        volumeSize: 100,
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
    });

    new iam.CfnServiceLinkedRole(this, 'Service Linked Role', {
      awsServiceName: 'es.amazonaws.com',
    });

    const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

    opensearchSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(defaultSecurityGroup.securityGroupId), ec2.Port.allTraffic(), 'global access to bastion group');
    opensearchSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(bastionSecurityGroup.securityGroupId), ec2.Port.allTraffic(), 'global access to bastion group');
    

    if(process.env.STAGE === "dev") {
      opensearchDomain.addAccessPolicies(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ['es:*'],
          principals: [
            new iam.AnyPrincipal()
          ]
        })
      )
    }

    new cdk.CfnOutput(this, 'opensearchEndpoint', {
      value: opensearchDomain.domainEndpoint,
      description: 'The endpoint for the opensearch domain',
      exportName: 'opensearchEndpoint',
    });

    this.opensearchSecurityGroup = opensearchSecurityGroup;
  }
}
