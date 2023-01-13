import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";

interface CollectFrontendStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class CollectFrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CollectFrontendStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);
    const DOMAIN_NAME = envConfig.domainName;
    const WEB_APP_DOMAIN = `${DOMAIN_NAME}`;

    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN_NAME,
    });

    //Create S3 Bucket for our website
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: WEB_APP_DOMAIN,
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //TODO: This will need to change when building within Becket AWS
    const siteCertificate = new acm.DnsValidatedCertificate(
      this,
      "SiteCertificate",
      {
        domainName: WEB_APP_DOMAIN,
        hostedZone: zone,
        region: "us-east-1", //standard for acm certs
      }
    );

    const viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(
      siteCertificate,
      {
        sslMethod: cloudfront.SSLMethod.SNI,
        aliases: [WEB_APP_DOMAIN],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
      }
    );

    //Create CloudFront Distribution
    const siteDistribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "SiteDistribution",
      {
        viewerCertificate,
        errorConfigurations: [
          {
            errorCode: 404,
            responseCode: 200,
            errorCachingMinTtl: 0,
            responsePagePath: "/index.html",
          },
        ],
        originConfigs: [
          {
            customOriginSource: {
              domainName: siteBucket.bucketWebsiteDomainName,
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
      }
    );

    //TODO: This will need to change when building within Becket AWS
    new route53.ARecord(this, "SiteRecord", {
      recordName: WEB_APP_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(siteDistribution)
      ),
      zone,
    });

    new cdk.CfnOutput(this, "collectFrontEndBucketName", {
      value: siteBucket.bucketName,
      description: "The name for the site buckett",
    });

    //Deploy site to s3
    // new deploy.BucketDeployment(this, "Deployment", {
    //   sources: [deploy.Source.asset("./build")],
    //   destinationBucket: siteBucket,
    //   distribution: siteDistribution,
    //   distributionPaths: ["/*"],
    // });
  }
}
