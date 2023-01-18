import * as cdk from 'aws-cdk-lib';
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from 'constructs';
import { BaseInfra } from "../lib/base-infra";
import environmentConfig from "../util/environment-config";

interface Props extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}
export class NoxxInfrastructureStack extends cdk.Stack {
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly wildcardSiteCertificate: acm.Certificate;
  
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage } = props;
    
    const envConfig = environmentConfig(stage);
    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const publicSubnets = baseInfra.publicSubnets
    const privateSubnets = baseInfra.privateSubnets
    const hostedZone = baseInfra.hostedZone

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      "lambdaSG",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for Lambda microservices",
        securityGroupName: "LambdaSG",
      }
    );

    this.lambdaSecurityGroup = lambdaSecurityGroup;

    const wildcardSiteCertificate = new acm.DnsValidatedCertificate(
      this,
      "wildcardCertificate",
      {
        hostedZone,
        domainName: `*.${envConfig.domainName}`,
        region: "us-east-1", //standard for acm certs
      }
    );

    this.wildcardSiteCertificate = wildcardSiteCertificate;

    new cdk.CfnOutput(this, 'vpcPublicSubnets', {
      value: publicSubnets.map(sn => sn.subnetId).join(","),
      description: 'The public subnets for the vpc',
      exportName: 'vpcPublicSubnets',
    });

    new cdk.CfnOutput(this, 'vpcPrivateSubnets', {
      value: privateSubnets.map(sn => sn.subnetId).join(","),
      description: 'The private subnets for the vpc',
      exportName: 'vpcPrivateSubnets',
    });


    new cdk.CfnOutput(this, 'vpcSubnets', {
      value: [...privateSubnets, ...publicSubnets].map(sn => sn.subnetId).join(","),
      description: 'The subnets for the vpc',
      exportName: 'vpcSubnets',
    });

    new cdk.CfnOutput(this, 'lambdaSecurityGroupIds', {
      value: [lambdaSecurityGroup].map(sg => sg.securityGroupId).join(","),
      description: 'The security groups for lambdas',
      exportName: 'lambdaSecurityGroupIds',
    });

    new cdk.CfnOutput(this, 'wildcardSiteCertificate', {
      value: wildcardSiteCertificate.certificateArn,
      description: `The wildcard site certificate for *.${envConfig.domainName}`,
      exportName: 'wildcardSiteCertificateArn',
    });
  }
}
