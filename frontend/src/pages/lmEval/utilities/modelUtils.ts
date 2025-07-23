import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { LmModelArgument } from '#~/pages/lmEval/types';

/** Model option for LMEval configuration */
export type ModelOption = {
  label: string;
  value: string;
  namespace: string;
  displayName: string;
  service: InferenceServiceKind;
  port: number;
};

/** Model type option with endpoint configuration */
export type ModelTypeOption = {
  key: string;
  label: string;
  endpoint?: string;
};

/** Filters vLLM inference services by namespace */
export const filterVLLMInference = (
  services: InferenceServiceKind[],
  namespace: string,
): InferenceServiceKind[] =>
  services
    .filter((service: InferenceServiceKind) => service.metadata.namespace === namespace)
    .filter(
      (service: InferenceServiceKind) => service.spec.predictor.model?.modelFormat?.name === 'vLLM',
    );

/** Generates model options from inference services and serving runtimes */
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

    // Extract port from serving runtime container configuration
    let port = 80; // Default fallback
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const containers = servingRuntime?.spec?.containers;
    if (containers && containers.length > 0) {
      const container = containers[0];
      // Use type guard to safely check for ports configuration
      if ('ports' in container && Array.isArray(container.ports) && container.ports.length > 0) {
        const firstPort = container.ports[0];
        if (firstPort && 'containerPort' in firstPort && firstPort.containerPort) {
          port = firstPort.containerPort;
        }
      }
    } else if (runtimeName) {
      console.warn(
        `Serving runtime '${runtimeName}' not found for service '${name}' in namespace '${serviceNamespace}'`,
      );
    }

    return {
      label: displayName,
      value: name,
      namespace: serviceNamespace,
      displayName,
      service,
      port,
    };
  });

/** Handles model selection and URL construction */
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
    const { port } = selectedModelOption;
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

/** Handles model type selection and endpoint updates */
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
