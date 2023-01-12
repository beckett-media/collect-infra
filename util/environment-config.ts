export interface IEnvironmentConfig {
  readonly backup?: boolean;
  readonly vpnServerCertificateArn?: string;
  readonly vpnClientCertificateArn?: string;
  readonly domainName: string;
  readonly rootAccountId: string;
  readonly collectApiHttpApiId: string;
  readonly ssoApiHttpApiId: string;
  readonly isBeckett: boolean;
  readonly awsAccountId: string;
  readonly awsRegion: string;
  readonly vpcId: string;
  readonly publicSubnetsIds: string[];
  readonly publicSubnetsRtbIds: string[];
  readonly privateSubnetsIds: string[];
  readonly privateSubnetsRtbIds: string[];
}

const environmentConfig = (environmentName: string): IEnvironmentConfig => {
  const environmentMapper: {
    [environment: string]: {
      backup?: boolean;
      vpnServerCertificateArn?: string;
      vpnClientCertificateArn?: string;
      domainName: string;
      rootAccountId: string;
      collectApiHttpApiId: string;
      ssoApiHttpApiId: string;
      isBeckett: boolean;
      awsAccountId: string;
      awsRegion: string;
      vpcId: string;
      publicSubnetsIds: string[];
      publicSubnetsRtbIds: string[];
      privateSubnetsIds: string[];
      privateSubnetsRtbIds: string[];
    };
  } = {
    dev: {
      backup: true,
      vpnServerCertificateArn:
        "arn:aws:acm:us-east-1:223560911013:certificate/e0f2d3ef-1695-4cbd-bff1-76020d430a4b",
      vpnClientCertificateArn:
        "arn:aws:acm:us-east-1:223560911013:certificate/fe939073-ac74-409b-acb6-7d24b6f8d496",
      domainName: "beckettcollectdev.com",
      rootAccountId: "750497448356",
      collectApiHttpApiId: "e2hleqcy71",
      ssoApiHttpApiId: "dautelb593",
      isBeckett: false,
      awsAccountId: "",
      awsRegion: "",
      vpcId: "",
      publicSubnetsIds: [],
      publicSubnetsRtbIds: [],
      privateSubnetsIds: [],
      privateSubnetsRtbIds: [],
    },
    staging: {
      backup: false, // Whether or not the database and S3 buckets should be backed up with AWS Backup
      vpnServerCertificateArn: "", // See instructions in the readme in the VPN section
      vpnClientCertificateArn: "", // See instructions in the readme in the VPN section
      domainName: "beckettcollectstaging.com", // The domain you register prior to deployment. See "Collect Frontend" in the README
      rootAccountId: "750497448356", // The root AWS account of which this account is part of
      collectApiHttpApiId: "", // The API Gateway id of the collect api, which is deployed seperately. Note: This CDK code must be deployed prior to the collect api service. After this is deployed, you can deploy the api, grab the id, put it here and redeploy
      ssoApiHttpApiId: "", // The API Gateway id of the sso api, which is deployed seperately. Note: This CDK code must be deployed prior to the sso api service. After this is deployed, you can deploy SSO, grab the id, put it here and redeploy
      isBeckett: true, // Whether this environment is on a Beckett AWS account or a Noxx AWS account
      awsAccountId: "807430335579",
      awsRegion: "us-east-1",
      vpcId: "vpc-0592a7e113b0bdb10",
      publicSubnetsIds: ["subnet-086b09e5718569ad4", "subnet-0672fa40f9663afed"],
      publicSubnetsRtbIds: ["rtb-006235241ecae0a72", "rtb-02fe8d922966705c7"],
      privateSubnetsIds: ["subnet-0ea269f425b0815f3", "subnet-05ccd99ff68068fe7"],
      privateSubnetsRtbIds: ["rtb-0f0d2e4a52538fd47", "rtb-0193067819ab5d157"],
    },
    production: {
      backup: false,
      vpnServerCertificateArn: "",
      vpnClientCertificateArn: "",
      domainName: "beckettcollectproduction.com",
      rootAccountId: "750497448356",
      collectApiHttpApiId: "",
      ssoApiHttpApiId: "",
      isBeckett: true,
      awsAccountId: "",
      awsRegion: "",
      vpcId: "",
      publicSubnetsIds: [],
      publicSubnetsRtbIds: [],
      privateSubnetsIds: [],
      privateSubnetsRtbIds: [],
    },
  };
  return environmentMapper[environmentName];
};

export default environmentConfig;
