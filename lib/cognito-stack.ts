import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

interface CognitoStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

export class CognitoStack extends cdk.Stack {
  
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;

    const userPool = new cdk.aws_cognito.UserPool(this, "becketuserpool", {
      userPoolName: "beckett-userpool",
      selfSignUpEnabled: true,
      mfa: cdk.aws_cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      // follow the steps in the Cognito Developer Guide to verify an email address, move the account out of the SES sandbox, and grant Cognito email permissions via an authorization policy
      // email: cdk.aws_cognito.UserPoolEmail.withSES({
      //   sesRegion: "us-east-1",
      //   fromEmail: "noreply@beckett.com",
      //   fromName: "Beckett",
      //   replyTo: "support@beckett.com",
      //   sesVerifiedDomain: "beckett.com",
      // }),
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      userVerification: {
        emailSubject: "Verify your email!",
        emailBody: "Thanks for signing up! Your verification code is {####}",
        emailStyle: cdk.aws_cognito.VerificationEmailStyle.CODE,
        smsMessage: "Thanks for signing up! Your verification code is {####}",
      },
      signInAliases: {
        preferredUsername: true,
        email: true,
        phone: true
      },
      signInCaseSensitive: false,
      standardAttributes: {
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
        profilePicture: {
          required: false,
          mutable: true,
        },
        preferredUsername: {
          required: false,
          mutable: true,
        },
      },
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId, exportName: "UserPoolId" });
    new cdk.CfnOutput(this, "UserPoolArn", { value: userPool.userPoolArn, exportName: "UserPoolArn" });

  }
}
