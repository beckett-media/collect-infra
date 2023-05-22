import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
interface IamDeployUserStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class IamDeployUserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IamDeployUserStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const deployRole = new iam.Role(this, "deployRole", {
      description: "This role allows cross-account deployment of collect repos",
      roleName: "CollectDeployRole",
      assumedBy: new iam.AccountPrincipal("756244784198"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AWSCloudFormationFullAccess"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonAPIGatewayAdministrator"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryFullAccess"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudFrontFullAccess"),
      ],
    })

    const ssmPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["ssm:GetParametersByPath", "cloudformation:CreateChangeSet"],
    });

    new cdk.CfnOutput(this, "deployRoleArn", {
      value: deployRole.roleArn,
    });
  }
}
