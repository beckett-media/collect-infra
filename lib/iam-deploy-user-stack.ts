import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnAccessKey } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface IamDeployUserStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

export class IamDeployUserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IamDeployUserStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;

    const user = new iam.User(this, "deployBotIamUser", {
      userName: "deployBot",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayAdministrator"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudFrontFullAccess"),
      ]
    });

    user.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ['ssm:GetParametersByPath', 'cloudformation:CreateChangeSet']
    }));

    const accessKey = new CfnAccessKey(this, "CfnAccessKey", {
      userName: user.userName,
    });

    new cdk.CfnOutput(this, 'accessKeyId', { value: accessKey.ref });
    new cdk.CfnOutput(this, 'secretAccessKey', { value: accessKey.attrSecretAccessKey });
  }
}
