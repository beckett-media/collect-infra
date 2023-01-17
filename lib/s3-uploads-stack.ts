import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig,
} from "../util/environment-config";

interface S3UploadsStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

//TODO: Consider adding a Beckett CNAME for CloudFront

export class S3UploadsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3UploadsStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);

    const userUploadBucket = new s3.Bucket(this, "userUploadBucket", {
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
            "ETag",
          ],
        },
      ],
      removalPolicy:
        stage === "production"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });
    const cloudfrontDistro = new cloudfront.Distribution(
      this,
      "cloudfrontDistro",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(userUploadBucket),
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        },
      }
    );

    Tags.of(userUploadBucket).add("backup", envConfig.backup! ? "yes" : "no");

    new cdk.CfnOutput(this, `S3UserUploadBucket`, {
      value: userUploadBucket.bucketName,
      exportName: "s3UserUploadBucket",
    });

    new cdk.CfnOutput(this, `CloudFrontUserUploadDomainName`, {
      value: cloudfrontDistro.domainName,
      exportName: "cloudFrontUserUploadDomainName",
    });
  }
}
