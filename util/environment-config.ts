export interface IEnvironmentConfig {
  readonly backup?: boolean;
  readonly vpnServerCertificateArn?: string;
  readonly vpnClientCertificateArn?: string;
  readonly domainName: string;
  readonly rootAccountId: string;
  readonly collectApiHttpApiId: string;
  readonly ssoApiHttpApiId: string;
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
    },
    staging: {
      backup: false,
      vpnServerCertificateArn: "",
      vpnClientCertificateArn: "",
      domainName: "beckettcollectstaging.com",
      rootAccountId: "750497448356",
      collectApiHttpApiId: "",
      ssoApiHttpApiId: "",
    },
    production: {
      backup: false,
      vpnServerCertificateArn: "",
      vpnClientCertificateArn: "",
      domainName: "beckettcollectproduction.com",
      rootAccountId: "750497448356",
      collectApiHttpApiId: "",
      ssoApiHttpApiId: "",
    },
  };
  return environmentMapper[environmentName];
};

export default environmentConfig;
