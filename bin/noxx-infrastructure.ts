#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { AuroraStack } from "../lib/aurora-stack";
import { AwsCdkCloudWatchStack } from "../lib/aws-cdk-cloudwatch-stack";
import { BackupStack } from "../lib/backup-stack";
import { BastionStack } from "../lib/bastion-stack";
import { BinderApiStack } from "../lib/binder-api-stack";
import { CardRecognitionApiStack } from "../lib/card-recognition-stack";
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
import { WorkerStack } from "../lib/worker-stack";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";
if (!process.env.STAGE) {
  throw new Error("You must pass STAGE as a variable to this script");
}

const stage = process.env.STAGE as unknown as "dev" | "preprod" | "production";

const app = new cdk.App();
const envConfig: IEnvironmentConfig = environmentConfig(stage);
const envDetails = {
  region: envConfig.awsRegion,
  account: envConfig.awsAccountId,
};

const NoxxInfra = new NoxxInfrastructureStack(
  app,
  `CollectInfrastructureStack-${stage}`,
  {
    stage,
    env: envDetails,
  }
);

const bastionStack = stage === "dev" 
  ? new BastionStack(app, `CollectBastionStack-${stage}`, {
    stage,
    env: envDetails,
    }) 
  : null

const workerStack = new WorkerStack(
    app, `CollectWorkerStack-${stage}`, 
    {
      stage,
      env: envDetails,
    }
  );

const auroraStack = new AuroraStack(app, `CollectAuroraClusterStack-${stage}`, {
  stage,
  terminationProtection: stage === "production",
  env: envDetails,
  lambdaSecurityGroup: NoxxInfra.lambdaSecurityGroup,
  bastionSecurityGroup: stage === "dev" ? bastionStack?.bastionSecurityGroup : undefined,
  workerSecurityGroup: workerStack.workerSecurityGroup
});

const elasticacheStack = new ElasticacheStack(
  app,
  `CollectElasticacheStack-${stage}`,
  {
    stage,
    terminationProtection: stage === "production",
    env: envDetails,
    lambdaSecurityGroup: NoxxInfra.lambdaSecurityGroup,
  }
);

const iamDeployUserStack = new IamDeployUserStack(
  app,
  `CollectIamDeployUserStack-${stage}`,
  {
    stage,
    terminationProtection: stage === "production",
    env: envDetails,
  }
);

const opensearchStack = new OpensearchStack(
  app,
  `CollectOpensearchStack-${stage}`,
  {
    stage,
    bastionSecurityGroup: stage === "dev" ? bastionStack?.bastionSecurityGroup : undefined,
    terminationProtection: stage === "production",
    env: envDetails,
    lambdaSecurityGroup: NoxxInfra.lambdaSecurityGroup,
    siteCertificate: NoxxInfra.siteCertificate,
    workerSecurityGroup: workerStack.workerSecurityGroup
  }
);

const s3UploadsStack = new S3UploadsStack(
  app,
  `CollectS3UploadsStack-${stage}`,
  {
    stage,
    terminationProtection: stage === "production",
    env: envDetails,
  }
);

const s3StaticAssetsStack = new S3StaticAssetsStack(
  app,
  `CollectS3StaticAssetsStack-${stage}`,
  {
    stage,
    terminationProtection: stage === "production",
    env: envDetails,
    siteCertificate: NoxxInfra.siteCertificate,
  }
);

const cwStack = new AwsCdkCloudWatchStack(
  app,
  `CollectAwsCdkAuroraAlarmsStack-${stage}`,
  {
    dbCluster: auroraStack.dbCluster,
    email: process.env.EMAIL ?? "cswann@beckett.com", //TODO: This should be an engineering alias to alert them of problems such as slow queries
    env: envDetails,
  }
);

const cognitoStack = new CognitoStack(app, `CollectAwsCognitoStack-${stage}`, {
  stage,
  env: envDetails,
  siteCertificate: NoxxInfra.siteCertificate,
});

const backupStack = new BackupStack(app, `CollectAwsBackupStack-${stage}`, {
  stage,
  env: envDetails,
});

const collectFrontEnd = new CollectFrontendStack(
  app,
  `CollectFrontendStack-${stage}`,
  {
    stage,
    env: envDetails,
    siteCertificate: NoxxInfra.siteCertificate,
  }
);

const collectApiStack = new CollectApiStack(app, `CollectApiStack-${stage}`, {
  stage,
  env: envDetails,
  siteCertificate: NoxxInfra.siteCertificate,
});

const cardRecognitionApiStack = new CardRecognitionApiStack(
  app,
  `CardRecognitionApiStack-${stage}`,
  {
    stage,
    env: envDetails,
    siteCertificate: NoxxInfra.siteCertificate,
  }
);

const binderApiStack = new BinderApiStack(
  app,
  `BinderApiStack-${stage}`,
  {
    stage,
    env: envDetails,
    siteCertificate: NoxxInfra.siteCertificate,
  }
);

const iamBackendDev = new IamBackendDevsStack(
  app,
  `CollectIamBackendDevsStack-${stage}`,
  {
    stage,
    env: envDetails,
  }
);

// const pipelineStack = new PipelineStack(
//   app,
//   "CollectPipelineStack",
//   {
//     env: {
//       region: "us-east-1",
//       account: "756244784198",
//     },
//   }
// );

// const pipelineApiStack = new ApiPipelineStack(
//   app,
//   `CollectApiPipelineStack-${stage}`,
//   { 
//     stage,
//     env: {
//       region: "us-east-1",
//       account: "756244784198",
//     },
//   }
// );

// const pipelineFrontendStack = new FrontendPipelineStack(
//   app,
//   `CollectFrontendPipelineStack-${stage}`,
//   { 
//     stage,
//     env: {
//       region: "us-east-1",
//       account: "756244784198",
//     },
//   }
// );