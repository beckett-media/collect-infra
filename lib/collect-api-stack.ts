import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { BaseInfra } from "../lib/base-infra";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";

interface CollectApiStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
  wildcardSiteCertificate: cdk.aws_certificatemanager.Certificate;
}

export class CollectApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CollectApiStackProps) {
    super(scope, id, props);

    const { stage, wildcardSiteCertificate } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);
    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const hostedZone = baseInfra.hostedZone
    
    const DOMAIN_NAME = envConfig.domainName;
    const API_DOMAIN = `api.${DOMAIN_NAME}`;

    const dn = new apigwv2.DomainName(this, "DN", {
      domainName: API_DOMAIN,
      certificate: wildcardSiteCertificate,
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

    new route53.ARecord(this, "ApiSiteRecord", {
      recordName: API_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          dn.regionalDomainName,
          dn.regionalHostedZoneId
        )
      ),
      zone: hostedZone,
    });

    new cdk.CfnOutput(this, "collectApiDomain", {
      value: API_DOMAIN,
      description: "The domain for the collect api",
      exportName: "collectApiDomain",
    });
  }
}
