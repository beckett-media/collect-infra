import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from 'constructs';
import { BaseInfra } from "../lib/base-infra";

interface Props extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}
export class NoxxInfrastructureStack extends cdk.Stack {
  public readonly lambdaSecurityGroup: cdk.aws_ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage } = props;

    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const publicSubnets = baseInfra.publicSubnets
    const privateSubnets = baseInfra.privateSubnets

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
  }
}
