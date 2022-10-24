import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as backup from "aws-cdk-lib/aws-backup";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";

interface BackupStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "production";
  vpc: cdk.aws_ec2.Vpc;
}

export class BackupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const { stage, vpc } = props;

    const plan = backup.BackupPlan.dailyWeeklyMonthly5YearRetention(
      this,
      "Plan"
    );
    plan.addSelection("Selection", {
      resources: [
        backup.BackupResource.fromTag("backup", "yes"), // All resources that are tagged backup=yes
      ],
    });

    plan.addRule(
      new backup.BackupPlanRule({
        completionWindow: Duration.hours(2),
        startWindow: Duration.hours(1),
        scheduleExpression: Schedule.cron({
          day: "15",
          hour: "3",
          minute: "30",
        }),
        moveToColdStorageAfter: Duration.days(30),
      })
    );

    plan.addRule(
      new backup.BackupPlanRule({
        enableContinuousBackup: true,
        deleteAfter: Duration.days(7),
      })
    );

    new cdk.CfnOutput(this, "BackupPlanId", {
      value: plan.backupPlanId,
    });
  }
}
