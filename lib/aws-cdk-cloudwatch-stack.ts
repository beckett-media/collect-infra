import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as logs from "aws-cdk-lib/aws-logs";
import { DatabaseCluster } from 'aws-cdk-lib/aws-rds';
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subs from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from 'constructs';

export interface AwsCdkCloudWatchStackProps extends StackProps {
  readonly dbCluster: DatabaseCluster;
  readonly email: string;
}

export class AwsCdkCloudWatchStack extends Stack {
    constructor(scope: Construct, id: string, props: AwsCdkCloudWatchStackProps) {
      super(scope, id, props);

      const dbLogGroup = logs.LogGroup.fromLogGroupName(
        this,
        'DbLogGroup',
        `/aws/rds/cluster/${props.dbCluster.clusterIdentifier}/postgresql`
      );

      const filterMetric = dbLogGroup.addMetricFilter('SlowQueryMetricFilter', {
        filterPattern: logs.FilterPattern.anyTerm('duration'),
        metricName: 'SlowQuery',
        metricNamespace: 'AuroraPostgreSQL',
        defaultValue: 0
      });

      const metric = filterMetric.metric()
      const alarm = metric.createAlarm(this, 'SlowQueryAlarm', {
        threshold: 1,
        evaluationPeriods: 1
      });
      const snsTopic = new sns.Topic(this, 'SlowQueryTopic', {
        displayName: 'Slow Query Alarm Topic'
      });
      snsTopic.addSubscription(new sns_subs.EmailSubscription(props.email));
      alarm.addAlarmAction(new cw_actions.SnsAction(snsTopic));

      new CfnOutput(this, 'SlowQueryMetricFilterMetadata', {
        value: `${metric.namespace}/${metric.metricName}`,
      });
      new CfnOutput(this, 'SlowQueryAlarmName', {
        value: alarm.alarmName
      });
    }


}