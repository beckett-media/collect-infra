import {
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_iam,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class PipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: StackProps,
  ) {
    super(scope, id, props);

    const diffProject = new aws_codebuild.PipelineProject(
      this,
      "pipelineDiffProject",
      {
        projectName: "collect-diff",
        buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
          "../buildspec/buildspec-diff.yaml"
        ),
        environment: {
          computeType: aws_codebuild.ComputeType.MEDIUM,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_6_0,
          privileged: true,
        },
      }
    );

    const deployProject = new aws_codebuild.PipelineProject(
      this,
      "pipelineDeployProject",
      {
        projectName: "collect-deploy",
        buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
          "../buildspec/buildspec-deploy.yaml"
        ),
        environment: {
          computeType: aws_codebuild.ComputeType.MEDIUM,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_6_0,
          privileged: true,
        },
      }
    );

    deployProject.addToRolePolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"],
      })
    );

    const sourceOutput = new aws_codepipeline.Artifact();

    const sourceAction =
      new aws_codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "GetSource",
        owner: "beckett-media",
        repo: "collect-infra",
        branch: "feature/cicd",
        connectionArn: "arn:aws:codestar-connections:us-east-1:756244784198:connection/101fc724-1e5d-4e49-ae98-ef4e5e7dabc4",
        output: sourceOutput,
      });

    const Diff = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "CdkDiff",
      project: diffProject,
      input: sourceOutput,
    });

    const devDeploy = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "CdkDeploy",
      project: deployProject,
      input: sourceOutput,
      environmentVariables: {
        STAGE: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: "dev",
        },
      },
    });

    const manualApprovalPreprod = new aws_codepipeline_actions.ManualApprovalAction({
      actionName: "Approve",
    });
    
    const preprodDeploy = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "CdkDeploy",
      project: deployProject,
      input: sourceOutput,
      environmentVariables: {
        STAGE: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: "preprod",
        },
      },
    });

    const manualApprovalProd = new aws_codepipeline_actions.ManualApprovalAction({
      actionName: "Approve",
    });

    const prodDeploy = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "CdkDeploy",
      project: deployProject,
      input: sourceOutput,
      environmentVariables: {
        STAGE: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: "production",
        },
      },
    });

    const pipeline = new aws_codepipeline.Pipeline(this, "pipeline", {
      pipelineName: "CollectPipeline",
      enableKeyRotation: true
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: "Diff",
      actions: [Diff],
    });

    pipeline.addStage({
      stageName: "DeployDev",
      actions: [devDeploy],
    });

    pipeline.addStage({
      stageName: "ApprovalPreprod",
      actions: [manualApprovalPreprod],
    });

    pipeline.addStage({
      stageName: "DeployPreprod",
      actions: [preprodDeploy],
    });

    pipeline.addStage({
      stageName: "ApprovalProd",
      actions: [manualApprovalProd],
    });

    pipeline.addStage({
      stageName: "DeployProd",
      actions: [prodDeploy],
    });
  }
}
