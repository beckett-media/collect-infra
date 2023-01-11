export interface IEnvironmentConfig {
  readonly backup?: boolean;
  readonly vpnServerCertificateArn?: string;
  readonly vpnClientCertificateArn?: string;
  readonly domainName: string;
  readonly rootAccountId: string;
  readonly collectApiHttpApiId: string;
  readonly ssoApiHttpApiId: string;
  readonly isBeckett: boolean;
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
    },
  };
  return environmentMapper[environmentName];
};

export default environmentConfig;
