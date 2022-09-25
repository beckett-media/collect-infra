# Global Infrastructure

Hey there. This repo houses the code that builds the Noxx Global Infrastructure.

The various [services that comprise the Noxx Platform](https://github.com/NoXX-Technologies/docs/blob/main/developers/services/README.md) hook into this infrastructure.

## Install CDK
`$ npm install -g aws-cdk`

## Install TypeScript
`$ npm install -g typescript`

## Create a new AWS Sub Account
Note: the profile you use must have `organizations:CreateAccount` permissions in the parent account

`$ aws organizations create-account --email <env-name>@get-noxx.com --acount-name "infrastructure-<env-name>" --profile <profile>`

## Get account number
`$ aws sts get-caller-identity --profile <profile>`

## Bootstrap an environment
`$ cdk bootstrap aws://<account-number>/us-east-1 --profile <profile>`

## Deploying

`$ STAGE=<dev|staging|production> cdk deploy --profile <profile>`  

## Overview
- [Timeline and Goals](https://docs.google.com/spreadsheets/d/11EZpMwBINrwbvLawncP47e5jE4AiuK7G1mOnHFt0rGw/edit#gid=0)
- Diagram
![Diagram](Noxx%20Global%20Infrastructure%202.0.drawio.png)
- [Database Schema](https://dbdiagram.io/d/631f938d0911f91ba591ff92)
![Database Schema](Database%20Schema.png)
