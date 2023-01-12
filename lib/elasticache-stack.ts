import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { BaseInfra } from "../lib/base-infra";

interface ElasticacheStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
}

export class ElasticacheStack extends cdk.Stack {
  public readonly elasticacheSecurityGroup: cdk.aws_ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: ElasticacheStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const baseInfra = new BaseInfra(this, 'baseInfra', { stage: stage });
    const vpc = baseInfra.vpc
    const privateSubnets = baseInfra.privateSubnets
    
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      `RedisSubnetGroup`,
      {
        description: "Subnet group for  redis cluster",
        subnetIds: privateSubnets.map(ps => ps.subnetId),
        cacheSubnetGroupName: "Redis-Subnet-Group",
      }
    );

    const redisSecurityGroup = new ec2.SecurityGroup(
      this,
      `RedisSecurityGroup`,
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for the redis cluster",
      }
    );

    const redisCache = new elasticache.CfnCacheCluster(
      this,
      `RedisCache`,
      {
        engine: "redis",
        cacheNodeType: "cache.t3.micro",
        numCacheNodes: stage === "production" ? 3 : 1,
        clusterName: "elasticache-cluster",
        vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: redisSubnetGroup.ref,
        engineVersion: "6.2",
        preferredMaintenanceWindow: "fri:00:30-fri:01:30",
      }
    );

    // const defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", vpc.vpcDefaultSecurityGroup);

    redisCache.addDependsOn(redisSubnetGroup);

    // redisSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(defaultSecurityGroup.securityGroupId), ec2.Port.allTraffic(), 'global access to default group');

    new cdk.CfnOutput(this, `RedisCacheEndpointUrl`, {
      value: redisCache.attrRedisEndpointAddress,
      exportName: 'redisCacheEndpointUrl',
    });

    new cdk.CfnOutput(this, `RedisCachePort`, {
      value: redisCache.attrRedisEndpointPort,
      exportName: 'redisCachePort',
    });

    this.elasticacheSecurityGroup = redisSecurityGroup;
  }
}
