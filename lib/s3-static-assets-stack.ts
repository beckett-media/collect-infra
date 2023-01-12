import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import environmentConfig from "../util/environment-config";

interface S3StaticAssetsStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
}

export class S3StaticAssetsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3StaticAssetsStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig = environmentConfig(stage);
    const DOMAIN_NAME = envConfig.domainName;
    const ASSET_DOMAIN = `collectassets.${DOMAIN_NAME}`;

    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN_NAME,
    });

    const staticAssetsBucket = new s3.Bucket(this, "staticAssetsBucket", {
      removalPolicy:
        stage === "production"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    //TODO: This will need to change when building within Becket AWS
    const assetCertificate = new acm.DnsValidatedCertificate(
      this,
      "AssetCertificate",
      {
        domainName: ASSET_DOMAIN,
        hostedZone: zone,
        region: "us-east-1", //standard for acm certs
      }
    );

    const cloudfrontDistro = new cloudfront.Distribution(
      this,
      "staticAssetsCF",
      {
        certificate: assetCertificate,
        defaultBehavior: { origin: new origins.S3Origin(staticAssetsBucket) },
        domainNames: [ASSET_DOMAIN],
      }
    );

    Tags.of(staticAssetsBucket).add("backup", envConfig.backup! ? "yes" : "no");

    new route53.ARecord(this, "AssetsRecord", {
      recordName: ASSET_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(cloudfrontDistro)
      ),
      zone,
    });

    new cdk.CfnOutput(this, `S3StaticAssetsBucket`, {
      value: staticAssetsBucket.bucketName,
      exportName: "staticAssetsBucket",
    });

    new cdk.CfnOutput(this, `CloudFrontStaticAssetsDomainName`, {
      value: ASSET_DOMAIN,
      exportName: "cloudFrontStaticAssetsDomainName",
    });
  }
}
