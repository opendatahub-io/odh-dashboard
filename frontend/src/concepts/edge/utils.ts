import {
  PipelineKind,
  PipelineRunKind,
  PipelineRunTaskParam,
  PipelineWorkspaceDeclaration,
} from '~/k8sTypes';
import {
  EdgeModel,
  EdgeModelLocationType,
  EdgeModelParams,
  EdgeModelPipelineKnownWorkspaces,
  EdgeModelRun,
  EdgeModelVersion,
} from './types';
import { EdgeModelPipelineKnownResults, EdgeModelPipelineSecretWorkspace } from './types';

export const isSecretWorkspace = (
  workspace: PipelineWorkspaceDeclaration,
): workspace is EdgeModelPipelineSecretWorkspace =>
  (workspace.name === EdgeModelPipelineKnownWorkspaces.S3_SECRET ||
    workspace.name === EdgeModelPipelineKnownWorkspaces.GIT_BASIC_AUTH) &&
  typeof workspace.secret === 'object' &&
  workspace.secret !== null &&
  'secretName' in workspace.secret &&
  typeof workspace.secret.secretName === 'string';

const mapParamsToEdgeModelParams = (runParams: PipelineRunTaskParam[]): EdgeModelParams => {
  const paramMap = new Map(runParams.map((param) => [param.name, param.value]));

  return {
    modelName: paramMap.get('model-name') || '',
    modelVersion: paramMap.get('model-version') || '',
    s3BucketName: paramMap.get('s3-bucket-name'),
    containerFileRelativePath: paramMap.get('containerfileRelativePath'),
    modelRelativePath: paramMap.get('modelRelativePath'),
    fetchModel: paramMap.get('fetch-model') as EdgeModelLocationType,
    gitModelRepo: paramMap.get('git-model-repo'),
    gitRevision: paramMap.get('git-revision'),
    targetImageRepo: paramMap.get('target-imagerepo'),
  };
};

export const getEdgeModelRunContainerImage = (run: PipelineRunKind) =>
  run.status?.pipelineResults?.find(
    (result) => result.name === EdgeModelPipelineKnownResults.TARGET_REGISTRY_URL,
  )?.value;

export const isPipelineRunOutputOverridden = (
  version: EdgeModelVersion,
  selectedRun: EdgeModelRun,
) => {
  if (version.runs.length <= 1) {
    return false;
  }

  const sortedRuns = version.runs.sort((a, b) => {
    const aDate = a.run.metadata.creationTimestamp || '';
    const bDate = b.run.metadata.creationTimestamp || '';
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  // starting with the most recent run, find the first run that is successful (has a container image)
  const latestSuccessfulRun = sortedRuns.find((run) => !!run.containerImageUrl);

  // if the latest successful run is the same as the current run, then the output is not overridden
  return latestSuccessfulRun?.run.metadata.name !== selectedRun.run.metadata.name;
};

export function organizePipelineRuns(runs: PipelineRunKind[]): Record<string, EdgeModel> {
  const models: Record<string, EdgeModel> = {};

  runs.forEach((run) => {
    // check if run is a valid model run
    if (!run.spec || !run.spec.params) {
      return;
    }
    const modelParams = mapParamsToEdgeModelParams(run.spec.params);
    const modelName = modelParams.modelName;
    const modelVersion = modelParams.modelVersion;
    const status = run.status?.conditions?.[0];
    const s3SecretWorkspace = run.spec.workspaces.find((secret) => secret.name === 's3-secret');
    const s3SecretName =
      s3SecretWorkspace && isSecretWorkspace(s3SecretWorkspace)
        ? s3SecretWorkspace.secret.secretName
        : undefined;

    const gitBasicAuthSecretWorkspace = run.spec.workspaces.find(
      (secret) => secret.name === 'git-basic-auth',
    );
    const gitBasicAuthSecretName =
      gitBasicAuthSecretWorkspace && isSecretWorkspace(gitBasicAuthSecretWorkspace)
        ? gitBasicAuthSecretWorkspace.secret.secretName
        : undefined;

    const edgeModelRun: EdgeModelRun = {
      run,
      status,
      version: modelVersion,
      containerImageUrl: getEdgeModelRunContainerImage(run),
      modelName,
    };

    s3SecretWorkspace;
    if (!models[modelName]) {
      models[modelName] = {
        params: modelParams,
        gitBasicAuthSecretName,
        s3SecretName,
        versions: {},
        latestRun: edgeModelRun,
        pipelineName: run.spec.pipelineRef?.name,
      };
    }

    if (!models[modelName].versions[modelVersion]) {
      models[modelName].versions[modelVersion] = {
        version: modelVersion,
        modelName,
        runs: [],
        latestSuccessfulImageUrl: undefined,
      };
    }

    models[modelName].versions[modelVersion].runs.push(edgeModelRun);

    // Update model if this run is more recent
    if (
      new Date(run.metadata.creationTimestamp ?? '') >
      new Date(models[modelName].latestRun?.run.metadata.creationTimestamp ?? '')
    ) {
      models[modelName].latestRun = edgeModelRun;
      models[modelName].params = modelParams;
      models[modelName].s3SecretName = s3SecretName;
      models[modelName].gitBasicAuthSecretName = gitBasicAuthSecretName;
    }
  });

  return models;
}

export const getModelsForPipeline = (pipeline: PipelineKind, models: EdgeModel[]): EdgeModel[] =>
  models.filter((model) => model.latestRun.run.spec.pipelineRef?.name === pipeline?.metadata.name);
