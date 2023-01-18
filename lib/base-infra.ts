import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";

export interface BaseInfraProps {
  stage: "dev" | "preprod" | "production";
}

export class BaseInfra extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.ISubnet[] = [];
  public readonly publicSubnets: ec2.ISubnet[] = [];
  public readonly hostedZone: route53.IHostedZone;
  
  constructor(scope: Construct, id: string, props: BaseInfraProps) {
    super(scope, id);
    
    const { stage } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);

    this.vpc = ec2.Vpc.fromLookup(this, "vpc", {
      vpcId: envConfig.vpcId,
    });

    envConfig.publicSubnetsIds.forEach((subnetId, index) => {
      this.publicSubnets.push(ec2.Subnet.fromSubnetAttributes(
        this,
        "publicSubnet"+index,
        {
          subnetId: subnetId,
          routeTableId: envConfig.publicSubnetsRtbIds[index]
        }
      ))
    })

    envConfig.privateSubnetsIds.forEach((subnetId, index) => {
      this.privateSubnets.push(ec2.Subnet.fromSubnetAttributes(
        this,
        "privateSubnet"+index,
        {
          subnetId: subnetId,
          routeTableId: envConfig.privateSubnetsRtbIds[index]
        }
      ))
    })

    this.hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: envConfig.domainName,
    });
  }
}