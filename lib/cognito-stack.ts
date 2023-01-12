import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ses from "aws-cdk-lib/aws-ses";

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as targets from "aws-cdk-lib/aws-route53-targets";

import { Duration } from "aws-cdk-lib";
import { StringAttribute } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import environmentConfig from "../util/environment-config";

interface CognitoStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
}

export class CognitoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig = environmentConfig(stage);
    const DOMAIN_NAME = envConfig.domainName;
    const SSO_DOMAIN = `sso.${DOMAIN_NAME}`;
    const MAIL_DOMAIN = `mail.${DOMAIN_NAME}`;

    //TODO: This will need to change when building within Becket AWS
    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN_NAME,
    });

    //TODO: This will need to change when building within Becket AWS
    const siteCertificate = new acm.DnsValidatedCertificate(
      this,
      "SsoCertificate",
      {
        domainName: SSO_DOMAIN,
        hostedZone: zone,
        region: "us-east-1", //standard for acm certs
      }
    );

    const dn = new apigwv2.DomainName(this, "SsoDomainName", {
      domainName: SSO_DOMAIN,
      certificate: siteCertificate,
    });

    if (!!envConfig.ssoApiHttpApiId) {
      // if the sso microservice has been set up, create a domain map to it
      const api = apigwv2.HttpApi.fromHttpApiAttributes(this, "sso", {
        httpApiId: envConfig.ssoApiHttpApiId,
      });

      const apiStage = apigwv2.HttpStage.fromHttpStageAttributes(
        this,
        "sso-stage",
        {
          api,
          stageName: "$default",
        }
      );

      new apigwv2.ApiMapping(this, "ApiMapping", {
        api,
        domainName: dn,
        stage: apiStage,
      });
    }

    const identity = new ses.EmailIdentity(this, "Identity", {
      identity: ses.Identity.publicHostedZone(zone),
      mailFromDomain: MAIL_DOMAIN,
    });

    const userPool = new cdk.aws_cognito.UserPool(this, "becketuserpool", {
      removalPolicy:
        stage === "production"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      userPoolName: "beckett-userpool",
      selfSignUpEnabled: true,
      mfa: cdk.aws_cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      email: cdk.aws_cognito.UserPoolEmail.withSES({
        sesRegion: "us-east-1",
        fromEmail: `no-reply@${DOMAIN_NAME}`,
        fromName: "Beckett",
        replyTo: `support@${DOMAIN_NAME}`,
        sesVerifiedDomain: DOMAIN_NAME,
      }),
      passwordPolicy: {
        minLength: 7,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      // userVerification: {
      //   emailSubject: "Verify your email!",
      //   emailBody: "Thanks for signing up! Your verification code is {####}",
      //   emailStyle: cdk.aws_cognito.VerificationEmailStyle.CODE,
      //   smsMessage: "Thanks for signing up! Your verification code is {####}",
      // },
      signInAliases: {
        username: true,
        preferredUsername: true,
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      signInCaseSensitive: false,
      customAttributes: {
        billingAddress: new StringAttribute({
          mutable: true,
        }),
        shippingAddress: new StringAttribute({
          mutable: true,
        }),
      },
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
        // address: {
        //   required: false,
        //   mutable: true,
        // },
      },
    });

    userPool.node.addDependency(identity);

    const client = userPool.addClient("global-app-client", {
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(30),
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
      },
    });

    //TODO: This will need to change when building within Becket AWS

    new route53.ARecord(this, "SsoSiteRecord", {
      recordName: SSO_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          dn.regionalDomainName,
          dn.regionalHostedZoneId
        )
      ),
      zone,
    });

    new cdk.CfnOutput(this, "SsoDomain", {
      value: SSO_DOMAIN,
      exportName: "SsoDomain",
    });
    new cdk.CfnOutput(this, "CognitoClientId", {
      value: client.userPoolClientId,
      exportName: "CognitoClientId",
    });
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      exportName: "UserPoolId",
    });
    new cdk.CfnOutput(this, "UserPoolArn", {
      value: userPool.userPoolArn,
      exportName: "UserPoolArn",
    });
  }
}
