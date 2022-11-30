import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface VpcStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
}

//TODO: This may have to be modified to use existing VPCs?

export class VpcStack extends cdk.Stack {
  public readonly vpc: cdk.aws_ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const cidrMapping = {
      dev: "10.51.0.0/16",
      staging: "10.50.0.0/16",
      production: "10.52.0.0/16",
    };

    const vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 2,
      cidr: cidrMapping[stage as keyof typeof cidrMapping],
      natGateways: stage === "production" ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "ingress",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "application",
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: 28,
          name: "data",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // PRIVATE_ISOLATED if we don't need these to communicate between VPCs
        },
      ],
    });

    if (stage === "production") {
      vpc.addFlowLog("FlowLog");
    }

    this.vpc = vpc;
  }
}
