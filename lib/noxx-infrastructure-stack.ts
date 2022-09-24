import * as cdk from 'aws-cdk-lib';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface Props extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}
export class NoxxInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage, vpc } = props;

    const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

    new cdk.CfnOutput(this, 'vpcPublicSubnets', {
      value: vpc.publicSubnets.map(sn => sn.subnetId).join(","),
      description: 'The public subnets for the vpc',
      exportName: 'vpcPublicSubnets',
    });

    new cdk.CfnOutput(this, 'vpcPrivateSubnets', {
      value: vpc.privateSubnets.map(sn => sn.subnetId).join(","),
      description: 'The private subnets for the vpc',
      exportName: 'vpcPrivateSubnets',
    });

    new cdk.CfnOutput(this, 'vpcIsolatedSubnets', {
      value: vpc.isolatedSubnets.map(sn => sn.subnetId).join(","),
      description: 'The isolated subnets for the vpc',
      exportName: 'vpcIsolatedSubnets',
    });

    new cdk.CfnOutput(this, 'vpcSubnets', {
      value: [...vpc.privateSubnets, ...vpc.publicSubnets, ...vpc.isolatedSubnets].map(sn => sn.subnetId).join(","),
      description: 'The subnets for the vpc',
      exportName: 'vpcSubnets',
    });


    new cdk.CfnOutput(this, 'lambdaSecurityGroupIds', {
      value: [defaultSecurityGroup].map(sg => sg.securityGroupId).join(","),
      description: 'The security groups for lambdas',
      exportName: 'lambdaSecurityGroupIds',
    });
  }
}
