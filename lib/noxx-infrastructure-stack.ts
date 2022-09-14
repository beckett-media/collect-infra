import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';
declare const vpc: ec2.Vpc;

export class NoxxInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'NoxxInfrastructureQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const vpc = new ec2.Vpc(this, 'VPC');
    const credentials = rds.Credentials.fromGeneratedSecret('clusteradmin');
    const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

    defaultSecurityGroup.addIngressRule(ec2.Peer.ipv4("0.0.0.0/0"), ec2.Port.tcp(3306), 'allow 3306 access for testing');

    const cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_02_0 }),
      credentials,
      instanceProps: {
        securityGroups: [defaultSecurityGroup],
        // optional , defaults to t3.medium
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
        vpcSubnets: {
          // subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          subnetType: ec2.SubnetType.PUBLIC
        },
        vpc,
      },
    });

    //

    const proxy = cluster.addProxy(`${id}-proxy`, {
      secrets: [cluster.secret!],
      debugLogging: true,
      vpc,
      securityGroups: [defaultSecurityGroup],
      iamAuth: true
    })

    // Workaround for bug where TargetGroupName is not set but required
    const targetGroup = proxy.node.children.find((child:any) => {
      return child instanceof rds.CfnDBProxyTargetGroup
    }) as rds.CfnDBProxyTargetGroup

    const role = new iam.Role(this, 'DBProxyRole', { assumedBy: new iam.AccountPrincipal(this.account) });

    targetGroup.addPropertyOverride('TargetGroupName', 'default');

    
    proxy.grantConnect(role, 'clusteradmin'); // Grant the role connection access to the DB Proxy for database user 'admin'.

    new cdk.CfnOutput(this, 'vpcPublicSubnets', {
      value: vpc.publicSubnets.map(sn => sn.subnetId).join(","),
      description: 'The public subnets for the vpc',
      exportName: 'vpcPublicSubnets',
    });

    new cdk.CfnOutput(this, 'vpcPrivateSubnets', {
      value: vpc.privateSubnets.map(sn => sn.subnetId).join(","),
      description: 'The private subnets for the vpc',
      exportName: 'vpcPrivateSubnets',
    });

    new cdk.CfnOutput(this, 'vpcSubnets', {
      value: [...vpc.privateSubnets, ...vpc.publicSubnets].map(sn => sn.subnetId).join(","),
      description: 'The subnets for the vpc',
      exportName: 'vpcSubnets',
    });


    new cdk.CfnOutput(this, 'lambdaSecurityGroupIds', {
      value: [defaultSecurityGroup].map(sg => sg.securityGroupId).join(","),
      description: 'The security groups for lambdas',
      exportName: 'lambdaSecurityGroupIds',
    });

    new cdk.CfnOutput(this, 'databaseProxyEndpoint', {
      value: proxy.endpoint,
      description: 'The proxy endpoint for the aurora cluster',
      exportName: 'auroraProxyEndpoint',
    });
    

    new cdk.CfnOutput(this, 'databaseSecretName', {
      value: cluster.secret?.secretName!,
      description: 'The secret name for our aurora cluster',
      exportName: 'auroraClusterSecretName',
    });

    new cdk.CfnOutput(this, 'databaseHostname', {
      value: cluster.clusterEndpoint.hostname,
      description: 'The hostname for the aurora cluster',
      exportName: 'auroraClusterHostname',
    });

    new cdk.CfnOutput(this, 'databasePort', {
      value: cluster.clusterEndpoint.port.toString(),
      description: 'The port for the aurora cluster',
      exportName: 'auroraClusterPort',
    });
  }
}
