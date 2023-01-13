import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseInfra } from "../lib/base-infra";

interface Props extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}
export class NoxxInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage } = props;

    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const publicSubnets = baseInfra.publicSubnets
    const privateSubnets = baseInfra.privateSubnets

    // const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

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
      value: [...vpc.privateSubnets, ...vpc.publicSubnets].map(sn => sn.subnetId).join(","),
      description: 'The subnets for the vpc',
      exportName: 'vpcSubnets',
    });


    // new cdk.CfnOutput(this, 'lambdaSecurityGroupIds', {
    //   value: [defaultSecurityGroup].map(sg => sg.securityGroupId).join(","),
    //   description: 'The security groups for lambdas',
    //   exportName: 'lambdaSecurityGroupIds',
    // });
  }
}
