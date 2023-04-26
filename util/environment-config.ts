export interface IEnvironmentConfig {
  readonly backup?: boolean;
  readonly vpnServerCertificateArn?: string;
  readonly vpnClientCertificateArn?: string;
  readonly vpnSubnetCidr?: string;
  readonly domainName: string;
  readonly rootAccountId: string;
  readonly collectApiHttpApiId: string;
  readonly ssoApiHttpApiId: string;
  readonly cardRecognitionApiHttpApiId: string;
  readonly binderApiHttpApiId: string;
  readonly isBeckett: boolean;
  readonly awsAccountId: string;
  readonly awsRegion: string;
  readonly vpcId: string;
  readonly publicSubnetsIds: string[];
  readonly publicSubnetsRtbIds: string[];
  readonly privateSubnetsIds: string[];
  readonly privateSubnetsRtbIds: string[];
  readonly dbSnapshotId: string;
}

const environmentConfig = (environmentName: string): IEnvironmentConfig => {
  const environmentMapper: {
    [environment: string]: {
      backup?: boolean;
      vpnServerCertificateArn?: string;
      vpnClientCertificateArn?: string;
      vpnSubnetCidr?: string;
      domainName: string;
      rootAccountId: string;
      collectApiHttpApiId: string;
      ssoApiHttpApiId: string;
      cardRecognitionApiHttpApiId: string;
      binderApiHttpApiId: string;
      isBeckett: boolean;
      awsAccountId: string;
      awsRegion: string;
      vpcId: string;
      publicSubnetsIds: string[];
      publicSubnetsRtbIds: string[];
      privateSubnetsIds: string[];
      privateSubnetsRtbIds: string[];
      dbSnapshotId: string;
    };
  } = {
    dev: {
      backup: false,
      vpnServerCertificateArn: "",
      vpnClientCertificateArn: "",
      vpnSubnetCidr: "10.212.134.0/24",
      domainName: "collect-dev.beckett.com",
      rootAccountId: "750497448356",
      collectApiHttpApiId: "ohwdppwae7",
      ssoApiHttpApiId: "72iy0srpy1",
      cardRecognitionApiHttpApiId: "3zzb69nxq6",
      binderApiHttpApiId: "85ke8885l4",
      isBeckett: true,
      awsAccountId: "438371105488",
      awsRegion: "us-east-1",
      vpcId: "vpc-0e9ba925154229a5a",
      publicSubnetsIds: [
        "subnet-0999888708dc2ec6d",
        "subnet-02b88877a9592faa2",
      ],
      publicSubnetsRtbIds: ["rtb-01db24de97a30ca4c", "rtb-0f99400c8c8ceac64"],
      privateSubnetsIds: [
        "subnet-02aa7000875bb691f",
        "subnet-01710af3304eea65b",
      ],
      privateSubnetsRtbIds: ["rtb-0ebfdeece6ab8d35c", "rtb-055c525d5c25731e6"],
      dbSnapshotId: "collect-aurora-import-from-preprod-26-04-2023",
    },
    preprod: {
      backup: true, // Whether or not the database and S3 buckets should be backed up with AWS Backup
      vpnServerCertificateArn: "", // See instructions in the readme in the VPN section
      vpnClientCertificateArn: "", // See instructions in the readme in the VPN section
      vpnSubnetCidr: "10.212.134.0/24",
      domainName: "collect-preprod.beckett.com", // The domain you register prior to deployment. See "Collect Frontend" in the README
      rootAccountId: "750497448356", // The root AWS account of which this account is part of
      collectApiHttpApiId: "j06hqkdtli", // The API Gateway id of the collect api, which is deployed seperately. Note: This CDK code must be deployed prior to the collect api service. After this is deployed, you can deploy the api, grab the id, put it here and redeploy
      ssoApiHttpApiId: "mw1mkbzhuj", // The API Gateway id of the sso api, which is deployed seperately. Note: This CDK code must be deployed prior to the sso api service. After this is deployed, you can deploy SSO, grab the id, put it here and redeploy
      cardRecognitionApiHttpApiId: "3ggzuyfnk5", // The API Gateway id of the card recognition api, which is deployed seperately. Note: This CDK code must be deployed prior to the sso api service. After this is deployed, you can deploy SSO, grab the id, put it here and redeploy
      binderApiHttpApiId: "0zj1z4ybv7",
      isBeckett: true, // Whether this environment is on a Beckett AWS account or a Noxx AWS account
      awsAccountId: "807430335579",
      awsRegion: "us-east-1",
      vpcId: "vpc-0592a7e113b0bdb10",
      publicSubnetsIds: [
        "subnet-086b09e5718569ad4",
        "subnet-0672fa40f9663afed",
      ],
      publicSubnetsRtbIds: ["rtb-006235241ecae0a72", "rtb-02fe8d922966705c7"],
      privateSubnetsIds: [
        "subnet-0ea269f425b0815f3",
        "subnet-05ccd99ff68068fe7",
      ],
      privateSubnetsRtbIds: ["rtb-0f0d2e4a52538fd47", "rtb-0193067819ab5d157"],
      dbSnapshotId: "collect-aurora-serverlessv2-base-snapshot-14-5",
    },
    production: {
      backup: true,
      vpnServerCertificateArn: "",
      vpnClientCertificateArn: "",
      vpnSubnetCidr: "10.212.134.0/24",
      domainName: "collect.beckett.com",
      rootAccountId: "750497448356",
      collectApiHttpApiId: "qfsvlr6tce", // The API Gateway id of the collect api, which is deployed seperately. Note: This CDK code must be deployed prior to the collect api service. After this is deployed, you can deploy the api, grab the id, put it here and redeploy
      ssoApiHttpApiId: "9oxhsamgjb", // The API Gateway id of the sso api, which is deployed seperately. Note: This CDK code must be deployed prior to the sso api service. After this is deployed, you can deploy SSO, grab the id, put it here and redeploy
      cardRecognitionApiHttpApiId: "7sjmpkoqu3",
      binderApiHttpApiId: "skao0kvg8k",
      isBeckett: true,
      awsAccountId: "796687042250",
      awsRegion: "us-east-1",
      vpcId: "vpc-0bc8ded0b6104e9f4",
      publicSubnetsIds: [
        "subnet-0caff20fea9ae9e82",
        "subnet-0d948079c31a3a56c",
      ],
      publicSubnetsRtbIds: ["rtb-02d9a54fd96d06378", "rtb-041f584a57c4f9a82"],
      privateSubnetsIds: [
        "subnet-0109e5779cb86ddaa",
        "subnet-0b2b877a705c8ca01",
      ],
      privateSubnetsRtbIds: ["rtb-0d61784f4d7c9a379", "rtb-080e473d7a8ca4f64"],
      dbSnapshotId: "collect-aurora-serverlessv2-base-snapshot-14-5",
    },
  };
  return environmentMapper[environmentName];
};

export default environmentConfig;
