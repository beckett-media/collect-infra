#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { AuroraStack } from "../lib/aurora-stack";
import { AwsCdkCloudWatchStack } from "../lib/aws-cdk-cloudwatch-stack";
import { BackupStack } from "../lib/backup-stack";
import { BastionStack } from "../lib/bastion-stack";
import { CognitoStack } from "../lib/cognito-stack";
import { CollectApiStack } from "../lib/collect-api-stack";
import { CollectFrontendStack } from "../lib/collect-frontend-stack";
import { ElasticacheStack } from "../lib/elasticache-stack";
import { IamBackendDevsStack } from "../lib/iam-backend-devs-stack";
import { IamDeployUserStack } from "../lib/iam-deploy-user-stack";
import { NoxxInfrastructureStack } from "../lib/noxx-infrastructure-stack";
import { OpensearchStack } from "../lib/opensearch-stack";
import { S3StaticAssetsStack } from "../lib/s3-static-assets-stack";
import { S3UploadsStack } from "../lib/s3-uploads-stack";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";
if (!process.env.STAGE) {
  throw new Error("You must pass STAGE as a variable to this script");
}

const stage = process.env.STAGE as unknown as "dev" | "staging" | "production";

const app = new cdk.App();
const envConfig: IEnvironmentConfig = environmentConfig(stage);
const envDetails = {
  region: envConfig.awsRegion,
  account: envConfig.awsAccountId
}
// const vpcStack = new VpcStack(app, "VpcStack", {
//   stage,
//   terminationProtection: stage === "production",
// });
const auroraStack = new AuroraStack(app, "AuroraClusterStack", {
  stage,
  terminationProtection: stage === "production",
  env: envDetails
});
const bastionStack = new BastionStack(app, "BastionStack", {
  stage,
  terminationProtection: stage === "production",
  env: envDetails
});
const elasticacheStack = new ElasticacheStack(app, "ElasticacheStack", {
  stage,
  terminationProtection: stage === "production",
  env: envDetails
});
const iamDeployUserStack = new IamDeployUserStack(app, "IamDeployUserStack", {
  stage,
  terminationProtection: stage === "production",
  env: envDetails
});
const opensearchStack = new OpensearchStack(app, "OpensearchStack", {
  stage,
  bastionSecurityGroup: bastionStack.bastionSecurityGroup,
  terminationProtection: stage === "production",
  env: envDetails
});
const s3UploadsStack = new S3UploadsStack(app, "S3UploadsStack", {
  stage,
  terminationProtection: stage === "production",
  env: envDetails
});
const s3StaticAssetsStack = new S3StaticAssetsStack(
  app,
  "S3StaticAssetsStack",
  {
    stage,
    terminationProtection: stage === "production",
    env: envDetails
  }
);

const cwStack = new AwsCdkCloudWatchStack(app, "AwsCdkAuroraAlarmsStack", {
  dbCluster: auroraStack.dbCluster,
  email: process.env.EMAIL ?? "cswann@beckett.com", //TODO: This should be an engineering alias to alert them of problems such as slow queries
  env: envDetails
});
const cognitoStack = new CognitoStack(app, "AwsCognitoStack", {
  stage,
  env: envDetails
});
const backupStack = new BackupStack(app, "AwsBackupStack", {
  stage,
});
const collectFrontEnd = new CollectFrontendStack(app, "CollectFrontendStack", {
  stage,
  env: envDetails
});
const collectApiStack = new CollectApiStack(app, "CollectApiStack", {
  stage,
  env: envDetails
});

const iamBackendDev = new IamBackendDevsStack(app, "IamBackendDevsStack", {
  stage,
  env: envDetails
});

// const vpnStack = !environmentConfig(stage).vpnServerCertificateArn
//   ? null
//   : new VpnStack(app, "VpnStack", {
//       stage,
//       vpc: vpcStack.vpc,
//     });

new NoxxInfrastructureStack(app, "NoxxInfrastructureStack", {
  stage,
  env: envDetails
});
