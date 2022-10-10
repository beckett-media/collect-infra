#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { AuroraStack } from '../lib/aurora-stack';
import { AwsCdkCloudWatchStack } from '../lib/aws-cdk-cloudwatch-stack';
import { BastionStack } from '../lib/bastion-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { ElasticacheStack } from '../lib/elasticache-stack';
import { IamDeployUserStack } from '../lib/iam-deploy-user-stack';
import { NoxxInfrastructureStack } from '../lib/noxx-infrastructure-stack';
import { OpensearchStack } from '../lib/opensearch-stack';
import { S3UploadsStack } from '../lib/s3-uploads-stack';
import { VpcStack } from '../lib/vpc-stack';


if(!process.env.STAGE) {
  throw new Error('You must pass STAGE as a variable to this script');
}

const stage = process.env.STAGE as unknown as "dev" | "staging" | "production";

const app = new cdk.App();
const vpcStack = new VpcStack(app, "VpcStack", {stage, terminationProtection: stage === "production"});
const auroraStack = new AuroraStack(app, "AuroraClusterStack", {stage, vpc: vpcStack.vpc, terminationProtection: stage === "production"});
const bastionStack = new BastionStack(app, "BastionStack", {stage, vpc: vpcStack.vpc, terminationProtection: stage === "production"});
const elasticacheStack = new ElasticacheStack(app, "ElasticacheStack", {stage, vpc: vpcStack.vpc, terminationProtection: stage === "production"});
const iamDeployUserStack = new IamDeployUserStack(app, "IamDeployUserStack", {stage, vpc: vpcStack.vpc, terminationProtection: stage === "production"});
const opensearchStack = new OpensearchStack(app, "OpensearchStack", {stage, vpc: vpcStack.vpc, bastionSecurityGroup: bastionStack.bastionSecurityGroup, terminationProtection: stage === "production"});
const s3UploadsStack = new S3UploadsStack(app, "S3UploadsStack", {stage, vpc: vpcStack.vpc, terminationProtection: stage === "production"});
const cwStack = new AwsCdkCloudWatchStack(app, 'AwsCdkAuroraAlarmsStack', {
  dbCluster: auroraStack.dbCluster,
  email: process.env.EMAIL ?? 'cswann@beckett.com'
});
const cognitoStack = new CognitoStack(app, 'AwsCognitoStack', {
  stage, 
  vpc: vpcStack.vpc
});

new NoxxInfrastructureStack(app, 'NoxxInfrastructureStack', {
  stage, 
  vpc: vpcStack.vpc, 
});
// new NoxxInfrastructureStack(app, 'NoxxInfrastructureStack', {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });