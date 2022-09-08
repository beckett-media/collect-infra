## Install CDK
`$ npm install -g aws-cdk`

## Install TypeScript
`$ npm install -g typescript`

## Create a new AWS Sub Account
Do this via console

## Get account number
`$ aws sts get-caller-identity --profile noxx-staging`

## Bootstrap an environment
`$ cdk bootstrap aws://602537455821/us-east-1 --profile noxx-staging`%  

# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
