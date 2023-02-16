import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import environmentConfig from "../util/environment-config";

interface iamBackendDevsStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class IamBackendDevsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: iamBackendDevsStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig = environmentConfig(stage);

    const managedPolicies = [
      iam.ManagedPolicy.fromAwsManagedPolicyName("EC2InstanceConnect"),
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "CloudWatchLogsReadOnlyAccess"
      ),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ReadOnlyAccess"),
    ];

    const role = new iam.Role(this, "backenddevs", {
      assumedBy: new iam.AccountPrincipal(envConfig.rootAccountId),
      roleName: "BackendAccess",
      managedPolicies,
    });

    const backendIamUser =
      stage === "production"
        ? null
        : new iam.User(this, "localBackenduser", {
            userName: "localBackenduser",
            managedPolicies,
          });

    const accessKey = !backendIamUser
      ? null
      : new iam.CfnAccessKey(this, "CfnAccessKey", {
          userName: backendIamUser.userName,
        });

    new cdk.CfnOutput(this, "backendDevAccessKeyId", {
      value: !!accessKey ? accessKey.ref : "n/a",
    });
    new cdk.CfnOutput(this, "backendDevAccessKey", {
      value: !!accessKey ? accessKey.attrSecretAccessKey : "n/a",
    });

    new cdk.CfnOutput(this, "backendDevRoleArn", { value: role.roleArn });
  }
}
