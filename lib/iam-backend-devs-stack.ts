import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import environmentConfig from "../util/environment-config";

interface iamBackendDevsStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

export class IamBackendDevsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: iamBackendDevsStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;
    const envConfig = environmentConfig(stage);

    const role = new iam.Role(this, "backenddevs", {
      assumedBy: new iam.AccountPrincipal(envConfig.rootAccountId),
      roleName: "BackendAccess",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("EC2InstanceConnect"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaReadOnlyAccess"),
      ],
    });

    new cdk.CfnOutput(this, "backendDevRoleArn", { value: role.roleArn });
  }
}
