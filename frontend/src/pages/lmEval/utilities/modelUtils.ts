import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { LmModelArgument } from '#~/pages/lmEval/types';

export type ModelOption = {
  label: string;
  value: string;
  namespace: string;
  displayName: string;
  service: InferenceServiceKind;
  port: number;
};

export type ModelTypeOption = {
  key: string;
  label: string;
  endpoint?: string;
};

export const filterVLLMInference = (
  services: InferenceServiceKind[],
  namespace: string,
): InferenceServiceKind[] =>
  services
    .filter((service: InferenceServiceKind) => service.metadata.namespace === namespace)
    .filter(
      (service: InferenceServiceKind) => service.spec.predictor.model?.modelFormat?.name === 'vLLM',
    );

export const generateModelOptions = (
  services: InferenceServiceKind[],
  servingRuntimes: ServingRuntimeKind[],
): ModelOption[] =>
  services.map((service: InferenceServiceKind) => {
    const {
      metadata: { annotations, name, namespace: serviceNamespace },
    } = service;
    const displayName = annotations?.['openshift.io/display-name'] || name;
    const runtimeName = service.spec.predictor.model?.runtime;

    const servingRuntime = servingRuntimes.find(
      (sr) => sr.metadata.name === runtimeName && sr.metadata.namespace === serviceNamespace,
    );
    // TODO: Revisit this when the ServingContainer type is updated to include ports
    const port = (servingRuntime?.spec.containers[0] as any)?.ports?.[0]?.containerPort || 80;

    return {
      label: displayName,
      value: name,
      namespace: serviceNamespace,
      displayName,
      service,
      port,
    };
  });

export const handleModelSelection = (
  selectedModelName: string,
  modelOptions: ModelOption[],
  currentModel: LmModelArgument,
  currentModelType: string,
  findOptionForKey: (key: string) => ModelTypeOption | undefined,
): {
  deployedModelName: string;
  model: LmModelArgument;
} => {
  const selectedModelOption = modelOptions.find(
    (option: ModelOption) => option.value === selectedModelName,
  );

  if (!selectedModelOption) {
    return {
      deployedModelName: selectedModelName,
      model: currentModel,
    };
  }

  const baseUrl =
    selectedModelOption.service.status?.url ||
    selectedModelOption.service.status?.address?.url ||
    '';

  let urlWithPort = baseUrl;
  if (
    baseUrl &&
    baseUrl.includes('.svc.cluster.local') &&
    !baseUrl.includes('.svc.cluster.local:')
  ) {
    const port = selectedModelOption.port;
    urlWithPort = baseUrl.replace('.svc.cluster.local', `.svc.cluster.local:${port}`);
  }

  let finalUrl = urlWithPort;
  if (currentModelType && urlWithPort) {
    const modelOption = findOptionForKey(currentModelType);
    const endpoint = modelOption?.endpoint ?? '';
    finalUrl = `${urlWithPort}${endpoint}`;
  }

  return {
    deployedModelName: selectedModelName,
    model: {
      ...currentModel,
      name: selectedModelOption.displayName,
      url: finalUrl,
    },
  };
};

export const handleModelTypeSelection = (
  modelType: string,
  currentModel: LmModelArgument,
  findOptionForKey: (key: string) => ModelTypeOption | undefined,
): {
  modelType: string;
  model: LmModelArgument;
} => {
  if (!currentModel.url) {
    return {
      modelType,
      model: currentModel,
    };
  }

  const baseUrl = currentModel.url.replace(/\/v1\/(chat\/)?completions/, '');
  const modelOption = findOptionForKey(modelType);
  const endpoint = modelOption?.endpoint ?? '';

  return {
    modelType,
    model: {
      ...currentModel,
      url: `${baseUrl}${endpoint}`,
    },
  };
};
