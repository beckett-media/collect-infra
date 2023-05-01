import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseInfra } from "../lib/base-infra";

interface WorkerStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
  
}

export class WorkerStack extends cdk.Stack {
  public readonly workerSecurityGroup: cdk.aws_ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: WorkerStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const privateSubnets = baseInfra.privateSubnets

    const workerRole = new iam.Role(this, 'WorkerIamRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    })

    const workerSecurityGroup = new ec2.SecurityGroup(this, 'WorkerSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for worker node',
      securityGroupName: 'WorkerSecurityGroup'
    });

    //adjust below as needed
    workerSecurityGroup.addIngressRule(ec2.Peer.ipv4("10.0.0.0/8"), ec2.Port.tcp(22), 'SSH access for port forwarding');

    const workerNode = new ec2.Instance(this, 'WorkerNode', {
      vpc,
      vpcSubnets: {
        subnets: privateSubnets
      },
      role: workerRole,
      securityGroup: workerSecurityGroup,
      instanceType: new ec2.InstanceType('m7g.4xlarge'),
      machineImage: new ec2.GenericLinuxImage({
        'us-east-1': 'ami-0c6c29c5125214c77'
      }),
      keyName: `collect-worker-${stage}`,
      instanceName: 'WorkerNode'
    })


    // const profile = this.node.tryGetContext('profile');
    // const createSshKeyCommand = 'ssh-keygen -t rsa -f noxx-key';
    // const pushSshKeyCommand = `aws ec2-instance-connect send-ssh-public-key --region ${cdk.Aws.REGION} --instance-id ${workerNodeLinux.instanceId} --availability-zone ${workerNodeLinux.instanceAvailabilityZone} --instance-os-user ec2-user --ssh-public-key file://noxx-key.pub ${profile ? `--profile ${profile}` : ''}`;
    // const sshCommand = `ssh -o "IdentitiesOnly=yes" -i noxx-key ec2-user@${workerNodeLinux.instancePrivateIp}`;


            
    // new cdk.CfnOutput(this, 'CreateSshKeyCommand', { value: createSshKeyCommand });
    // new cdk.CfnOutput(this, 'PushSshKeyCommand', { value: pushSshKeyCommand });
    // new cdk.CfnOutput(this, 'SshCommand', { value: sshCommand});

    this.workerSecurityGroup = workerSecurityGroup;
  }
}
