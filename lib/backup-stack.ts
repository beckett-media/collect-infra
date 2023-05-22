import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as backup from "aws-cdk-lib/aws-backup";
import { Schedule } from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface BackupStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class BackupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const plan = backup.BackupPlan.dailyWeeklyMonthly5YearRetention(
      this,
      "Plan"
    );

    const managedPolicies = [
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSBackupServiceRolePolicyForBackup"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSBackupServiceRolePolicyForRestores"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSBackupServiceRolePolicyForS3Backup"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSBackupServiceRolePolicyForS3Restore"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSBackupFullAccess"),
    ];

    const backupRole = new iam.Role(this, "backupRole", {
      assumedBy: new iam.ServicePrincipal("backup.amazonaws.com"),
      roleName: "collectBackupAccess",
      managedPolicies,
    });

    const backupSelection = new backup.BackupSelection(
      this,
      "Selection",
      {
        backupPlan: plan,
        resources: [backup.BackupResource.fromTag("backup", "yes")],
        role: backupRole
      }
    )

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
