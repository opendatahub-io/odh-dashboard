import { PipelineRunKind, PipelineRunTaskParam, PipelineWorkspaceDeclaration } from '~/k8sTypes';
import {
  EdgeModel,
  EdgeModelLocationType,
  EdgeModelParams,
  EdgeModelRun,
  EdgeModelVersion,
} from './types';
import { EdgeModelPipelineKnownResults, EdgeModelPipelineS3SecretWorkspace } from './types';

export const isS3SecretWorkspace = (
  workspace: PipelineWorkspaceDeclaration,
): workspace is EdgeModelPipelineS3SecretWorkspace =>
  workspace.name === 's3-secret' &&
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
    gitServer: paramMap.get('gitServer'),
    gitOrgName: paramMap.get('gitOrgName'),
    gitRepoName: paramMap.get('gitRepoName'),
    containerfileRelativePath: paramMap.get('containerfileRelativePath'),
    modelRelativePath: paramMap.get('modelRelativePath'),
    fetchModel: paramMap.get('fetch-model') as EdgeModelLocationType,
    gitModelRepo: paramMap.get('git-model-repo'),
    gitRevision: paramMap.get('git-revision'),
    testEndpoint: paramMap.get('test-endpoint'),
    targetNamespace: paramMap.get('target-namespace'),
    targetImagerepo: paramMap.get('target-imagerepo'),
  };
};

export const getEdgeModelRunContainerImage = (run: PipelineRunKind) =>
  run.spec.pipelineSpec?.results?.find(
    (result) => result.name === EdgeModelPipelineKnownResults.TARGET_REGISTRY_URL,
  )?.value;

export const isPipelineRunOutputOverridden = (
  versions: EdgeModelVersion,
  selectedRun: EdgeModelRun,
) => {
  if (versions.runs.length <= 1) {
    return false;
  }

  const sortedRuns = versions.runs.sort((a, b) => {
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
    const status = run.status?.conditions?.[0]?.reason ?? 'unknown';

    const s3SecretWorkspace = run.spec.workspaces.find((secret) => secret.name === 's3-secret');

    const edgeModelRun: EdgeModelRun = {
      run,
      status,
      containerImageUrl: getEdgeModelRunContainerImage(run),
    };

    s3SecretWorkspace;
    if (!models[modelName]) {
      models[modelName] = {
        params: modelParams,
        // containerImageSecretName: run.spec.workspaces,
        s3SecretName:
          s3SecretWorkspace && isS3SecretWorkspace(s3SecretWorkspace)
            ? s3SecretWorkspace.secret.secretName
            : undefined,
        versions: {},
        latestRun: edgeModelRun,
      };
    }

    if (!models[modelName].versions[modelVersion]) {
      models[modelName].versions[modelVersion] = {
        version: modelVersion,
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
      models[modelName].s3SecretName =
        s3SecretWorkspace && isS3SecretWorkspace(s3SecretWorkspace)
          ? s3SecretWorkspace.secret.secretName
          : undefined;
      // containerImageSecretName: run.spec.workspaces,
    }
  });

  return models;
}

// export const rerunEdgeModel(model: EdgeModel, imageOutputStrategy: 'increment' | 'overwrite') => {
