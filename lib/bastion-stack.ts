import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BaseInfra } from "../lib/base-infra";

interface BastionStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
  
}

export class BastionStack extends cdk.Stack {
  public readonly bastionSecurityGroup: cdk.aws_ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: BastionStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const publicSubnets = baseInfra.publicSubnets

    const bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for bastion host',
      securityGroupName: 'BastionSecurityGroup'
    });
    
    const bastionHostLinux = new ec2.BastionHostLinux(this, 'BastionHostLinux', {  
      vpc,
      securityGroup: bastionSecurityGroup,
      subnetSelection: {
        subnets: publicSubnets,
      }
    });

    const eip = new ec2.CfnEIP(this, "Ip", { instanceId: bastionHostLinux.instanceId });

    bastionHostLinux.allowSshAccessFrom(ec2.Peer.anyIpv4())

    const profile = this.node.tryGetContext('profile');
    const createSshKeyCommand = 'ssh-keygen -t rsa -f noxx-key';
    const pushSshKeyCommand = `aws ec2-instance-connect send-ssh-public-key --region ${cdk.Aws.REGION} --instance-id ${bastionHostLinux.instanceId} --availability-zone ${bastionHostLinux.instanceAvailabilityZone} --instance-os-user ec2-user --ssh-public-key file://noxx-key.pub ${profile ? `--profile ${profile}` : ''}`;
    const sshCommand = `ssh -o "IdentitiesOnly=yes" -i noxx-key ec2-user@${bastionHostLinux.instancePublicDnsName}`;

    bastionSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');
            
    new cdk.CfnOutput(this, 'CreateSshKeyCommand', { value: createSshKeyCommand });
    new cdk.CfnOutput(this, 'PushSshKeyCommand', { value: pushSshKeyCommand });
    new cdk.CfnOutput(this, 'SshCommand', { value: sshCommand});

    this.bastionSecurityGroup = bastionSecurityGroup;

  }
}
