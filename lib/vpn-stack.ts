import * as cdk from "aws-cdk-lib";
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig,
} from "../util/environment-config";

interface VpnStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

//TODO: This will have to be modified to use Single sign-on (SAML 2.0-based federated authentication) https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html

export class VpnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VpnStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);
    const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      "SG",
      vpc.vpcDefaultSecurityGroup
    );
    // const vpnSecurityGroup = new SecurityGroup(this, "VpnSecurityGroup", {
    //   vpc,
    //   allowAllOutbound: true,
    //   description: "Security group for the vpn client connection",
    //   securityGroupName: "VpnSecurityGroup",
    // });

    const endpoint = vpc.addClientVpnEndpoint("Endpoint", {
      cidr: "10.100.0.0/16",
      serverCertificateArn: envConfig.vpnServerCertificateArn!,
      clientCertificateArn: envConfig.vpnClientCertificateArn!,
      splitTunnel: true,
      securityGroups: [defaultSecurityGroup],
      // authorizeAllUsersToVpcCidr: false,
    });

    // endpoint.addAuthorizationRule("Rule", {
    //   cidr: "0.0.0.0/0",
    // });

    new cdk.CfnOutput(this, "VpnEndpointId", {
      value: endpoint.endpointId,
    });
  }
}
