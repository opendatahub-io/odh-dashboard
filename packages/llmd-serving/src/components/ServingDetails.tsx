import * as React from 'react';
import { LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import type { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import {
  getServingRuntimeVersionStatus,
  renderDeploymentResourceVersionLabels,
  ServingRuntimeTemplateStatus,
  ServingRuntimeVersionStatus,
  ServingRuntimeVersionStatusLabel,
} from '@odh-dashboard/model-serving/shared/components';
import type { LLMdDeployment, LLMInferenceServiceConfigKind } from '../types';
import { useFetchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';

export const useServingDetailsData = (): FetchStateObject<LLMInferenceServiceConfigKind[]> => {
  const { dashboardNamespace } = useDashboardNamespace();
  return useFetchLLMInferenceServiceConfigs(dashboardNamespace);
};

type Props = {
  deployment: LLMdDeployment;
  data?: FetchStateObject<LLMInferenceServiceConfigKind[]>;
};

const LLMInferenceServiceServingDetails: React.FC<Props> = ({ deployment, data }) => {
  const { server } = deployment;
  const llmInferenceServiceConfigs = data?.data;

  const parentConfig = React.useMemo(
    () =>
      llmInferenceServiceConfigs?.find(
        (config) =>
          config.metadata.name === server?.metadata.annotations?.['opendatahub.io/template-name'],
      ),
    [llmInferenceServiceConfigs, server],
  );

  const parentConfigVersion =
    parentConfig?.metadata.annotations?.['opendatahub.io/runtime-version'];
  const childConfigVersion = server?.metadata.annotations?.['opendatahub.io/runtime-version'];
  const templateName = server?.metadata.annotations?.['opendatahub.io/template-name'];

  const isTemplateRemoved = !parentConfig && !!templateName && !!llmInferenceServiceConfigs;

  const versionStatus =
    parentConfigVersion && childConfigVersion
      ? getServingRuntimeVersionStatus(childConfigVersion, parentConfigVersion)
      : undefined;

  return server ? (
    <Stack>
      <StackItem>{getDisplayNameFromK8sResource(server)}</StackItem>
      <StackItem>
        <LabelGroup numLabels={5}>
          {renderDeploymentResourceVersionLabels(server, { isCompact: true })}
          {versionStatus && (
            <ServingRuntimeVersionStatus
              isOutdated={versionStatus === ServingRuntimeVersionStatusLabel.OUTDATED}
              version={childConfigVersion || ''}
              templateVersion={parentConfigVersion || ''}
            />
          )}
          {isTemplateRemoved && <ServingRuntimeTemplateStatus />}
        </LabelGroup>
      </StackItem>
    </Stack>
  ) : (
    'Distributed inference with llm-d'
  );
};

export default LLMInferenceServiceServingDetails;
