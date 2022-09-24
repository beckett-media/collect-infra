# Global Infrastructure

Hey there. This repo houses the code that builds the Noxx Global Infrastructure.

The various [services that comprise the Noxx Platform](https://github.com/NoXX-Technologies/docs/blob/main/developers/services/README.md) hook into this infrastructure.

## Install CDK
`$ npm install -g aws-cdk`

## Install TypeScript
`$ npm install -g typescript`

## Create a new AWS Sub Account
Do this via console

## Get account number
`$ aws sts get-caller-identity --profile <profile>`

## Bootstrap an environment
`$ cdk bootstrap aws://<account-number>/us-east-1 --profile <profile>`

## Deploying

`$ STAGE=<dev|staging|production> cdk deploy --profile <profile>`  

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Overview
- [Timeline and Goals](https://docs.google.com/spreadsheets/d/11EZpMwBINrwbvLawncP47e5jE4AiuK7G1mOnHFt0rGw/edit#gid=0)
- Diagram
![Diagram](Noxx%20Global%20Infrastructure%202.0.drawio.png)
- [Database Schema](https://dbdiagram.io/d/631f938d0911f91ba591ff92)
![Database Schema](Database%20Schema.png)