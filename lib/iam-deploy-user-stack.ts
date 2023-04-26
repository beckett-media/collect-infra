import {
  GithubActionsIdentityProvider,
  GithubActionsRole,
} from "aws-cdk-github-oidc";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { CfnAccessKey } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
interface IamDeployUserStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class IamDeployUserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IamDeployUserStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const provider = new GithubActionsIdentityProvider(this, "GithubProvider");

    const deployApiRole = new GithubActionsRole(this, "DeployApiRole", {
      provider: provider,
      owner: "beckett-media",
      repo: "collect-api",
      roleName: "DeployApiRole",
      description: "This role deploys collect-api repo from github actions",
      maxSessionDuration: cdk.Duration.hours(2),
    });

    const deployFrontendRole = new GithubActionsRole(
      this,
      "DeployFrontEndRole",
      {
        provider: provider,
        owner: "beckett-media",
        repo: "collect-frontend",
        roleName: "DeployFrontendRole",
        description:
          "This role deploys collect-frontend repo from github actions",
        maxSessionDuration: cdk.Duration.hours(2),
      }
    );

    const deployRole = new iam.Role(this, "deployRole", {
      description: "This role allows cross-account deployment of collect repos",
      roleName: "CollectDeployRole",
      // assumedBy: new iam.ArnPrincipal("arn:aws:iam::756244784198:role/CollectApiPipelineStack-pipelineDeployProjectRole6-1X5P9KN9BE6GR"),
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

    const user = new iam.User(this, "deployBotIamUser", {
      userName: "deployBot",
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
    });

    const accessKey = new CfnAccessKey(this, "CfnAccessKey", {
      userName: user.userName,
    });

    const ssmPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["ssm:GetParametersByPath", "cloudformation:CreateChangeSet"],
    });

    user.addToPolicy(ssmPolicy);

    deployFrontendRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
    );
    deployFrontendRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudFrontFullAccess")
    );

    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess")
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess")
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess")
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonAPIGatewayAdministrator"
      )
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonEC2ContainerRegistryFullAccess"
      )
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployFullAccess")
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess")
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudFrontFullAccess")
    );
    deployApiRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
    );
    deployApiRole.addToPolicy(ssmPolicy);

    new cdk.CfnOutput(this, "deployApiRole", { value: deployApiRole.roleArn });
    new cdk.CfnOutput(this, "deployFrontendRole", {
      value: deployFrontendRole.roleArn,
    });

    new cdk.CfnOutput(this, "accessKeyId", { value: accessKey.ref });
    new cdk.CfnOutput(this, "secretAccessKey", {
      value: accessKey.attrSecretAccessKey,
    });

    new cdk.CfnOutput(this, "deployRoleArn", {
      value: deployRole.roleArn,
    });
  }
}
