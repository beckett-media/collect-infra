import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig,
} from "../util/environment-config";

interface S3StaticAssetsStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

//TODO: Consider adding a Beckett CNAME for CloudFront

export class S3StaticAssetsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3StaticAssetsStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);

    const staticAssetsBucket = new s3.Bucket(this, "staticAssetsBucket", {
      removalPolicy:
        stage === "production"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });
    const cloudfrontDistro = new cloudfront.Distribution(
      this,
      "staticAssetsCF",
      {
        defaultBehavior: { origin: new origins.S3Origin(staticAssetsBucket) },
      }
    );

    Tags.of(staticAssetsBucket).add("backup", envConfig.backup! ? "yes" : "no");

    new cdk.CfnOutput(this, `S3StaticAssetsBucket`, {
      value: staticAssetsBucket.bucketName,
      exportName: "staticAssetsBucket",
    });

    new cdk.CfnOutput(this, `CloudFrontStaticAssetsDomainName`, {
      value: cloudfrontDistro.domainName,
      exportName: "cloudFrontStaticAssetsDomainName",
    });
  }
}
