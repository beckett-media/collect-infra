import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface S3UploadsStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

export class S3UploadsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3UploadsStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;

    const userUploadBucket = new s3.Bucket(this, 'userUploadBucket', {
      removalPolicy: stage === "production" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });
    const cloudfrontDistro = new cloudfront.Distribution(this, 'cloudfrontDistro', {
      defaultBehavior: { origin: new origins.S3Origin(userUploadBucket) },
    });

    new cdk.CfnOutput(this, `S3UserUploadBucket`, {
      value: userUploadBucket.bucketName,
      exportName: 's3UserUploadBucket',
    });

    new cdk.CfnOutput(this, `CloudFrontUserUploadDomainName`, {
      value: cloudfrontDistro.domainName,
      exportName: 'cloudFrontUserUploadDomainName',
    });
  }
}
