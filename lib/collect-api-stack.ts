import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig,
} from "../util/environment-config";

interface CollectApiStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
}

export class CollectApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CollectApiStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);
    const DOMAIN_NAME = envConfig.domainName;
    const API_DOMAIN = `collectapi.${DOMAIN_NAME}`;

    //TODO: This will need to change when building within Becket AWS
    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN_NAME,
    });

    //TODO: This will need to change when building within Becket AWS
    const siteCertificate = new acm.DnsValidatedCertificate(
      this,
      "ApiCertificate",
      {
        domainName: API_DOMAIN,
        hostedZone: zone,
        region: "us-east-1", //standard for acm certs
      }
    );

    //TODO: This will need to change when building within Becket AWS
    const dn = new apigwv2.DomainName(this, "DN", {
      domainName: API_DOMAIN,
      certificate: siteCertificate,
    });

    if (!!envConfig.collectApiHttpApiId) {
      // if the collect microservice has been set up, create a domain map to it

      const api = apigwv2.HttpApi.fromHttpApiAttributes(this, "rails-api", {
        httpApiId: envConfig.collectApiHttpApiId,
      });

      const apiStage = apigwv2.HttpStage.fromHttpStageAttributes(
        this,
        "rails-api-stage",
        {
          api,
          stageName: "$default",
        }
      );

      const apiMapping = new apigwv2.ApiMapping(this, "ApiMapping", {
        api,
        domainName: dn,
        stage: apiStage,
      });
    }

    // const viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(
    //   siteCertificate,
    //   {
    //     sslMethod: cloudfront.SSLMethod.SNI,
    //     aliases: [API_DOMAIN],
    //     securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
    //   }
    // );

    // //Create CloudFront Distribution
    // const siteDistribution = new cloudfront.CloudFrontWebDistribution(
    //   this,
    //   "SiteDistribution",
    //   {
    //     // aliasConfiguration: {
    //     //   acmCertRef: siteCertificateArn,
    //     //   names: [API_DOMAIN],
    //     //   securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
    //     // },
    //     // viewerCertificate: viewerCertificate,
    //     viewerCertificate,
    //     errorConfigurations: [
    //       {
    //         errorCode: 404,
    //         responseCode: 200,
    //         errorCachingMinTtl: 0,
    //         responsePagePath: "/index.html",
    //       },
    //     ],
    //     originConfigs: [
    //       {
    //         customOriginSource: {
    //           domainName: siteBucket.bucketWebsiteDomainName,
    //           originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    //         },
    //         behaviors: [
    //           {
    //             isDefaultBehavior: true,
    //           },
    //         ],
    //       },
    //     ],
    //   }
    // );

    //Create A Record Custom Domain to CloudFront CDN

    //TODO: This will need to change when building within Becket AWS
    new route53.ARecord(this, "ApiSiteRecord", {
      recordName: API_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          dn.regionalDomainName,
          dn.regionalHostedZoneId
        )
      ),
      zone,
    });

    new cdk.CfnOutput(this, "collectApiDomain", {
      value: API_DOMAIN,
      description: "The domain for the collect api",
      exportName: "collectApiDomain",
    });
  }
}
