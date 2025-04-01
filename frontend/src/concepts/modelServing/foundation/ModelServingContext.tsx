import * as React from 'react';
import { InferenceServiceKind, ProjectKind, ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { useTemplates } from '~/api';
import useTemplateOrder from '~/pages/modelServing/customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from '~/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { DEFAULT_CONTEXT_DATA, DEFAULT_LIST_WATCH_RESULT } from '~/utilities/const';
import { ContextResourceData, CustomWatchK8sResult } from '~/types';
import { SupportedServingPlatform } from '~/concepts/modelServing/platforms/const';
import useDetermineProjectServingPlatform from '~/concepts/modelServing/foundation/useDetermineProjectServingPlatform';

type ModelServingContextType = {
  // Metadata
  project: ProjectKind;
  selectedServing: SupportedServingPlatform | null;

  // Data
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  servingRuntimeTemplates: CustomWatchK8sResult<TemplateKind[]>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  project: null as unknown as ProjectKind,
  selectedServing: null,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_LIST_WATCH_RESULT,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
});

type ModelServingContextProviderProps = {
  children: React.ReactNode;
  project: ProjectKind;
};

const ModelServingContextProvider: React.FC<ModelServingContextProviderProps> = ({
  children,
  project,
}) => {
  const namespace = project.metadata.name;
  const selectedServing = useDetermineProjectServingPlatform(project);
  const { dashboardNamespace } = useNamespaces();

  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const servingRuntimeTemplates = useTemplates(dashboardNamespace);

  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );
  const servingRuntimeTemplateDisablement = useContextResourceData<string>(
    useTemplateDisablement(dashboardNamespace),
  );
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );

  const contextValue = React.useMemo(
    (): ModelServingContextType => ({
      project,
      selectedServing,
      servingRuntimes,
      servingRuntimeTemplates,
      servingRuntimeTemplateOrder,
      servingRuntimeTemplateDisablement,
      inferenceServices,
    }),
    [
      inferenceServices,
      servingRuntimeTemplateDisablement,
      servingRuntimeTemplateOrder,
      servingRuntimeTemplates,
      servingRuntimes,
    ],
  );

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};

export default ModelServingContextProvider;
