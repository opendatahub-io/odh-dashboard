import * as React from 'react';
import { LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import type { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import ServingRuntimeVersionLabel from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionLabel';
import { getServingRuntimeVersionStatus } from '@odh-dashboard/internal/pages/modelServing/utils';
import ServingRuntimeVersionStatus from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionStatus';
import { ServingRuntimeVersionStatusLabel } from '@odh-dashboard/internal/pages/modelServing/screens/const';
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

  const versionStatus =
    parentConfigVersion && childConfigVersion
      ? getServingRuntimeVersionStatus(childConfigVersion, parentConfigVersion)
      : undefined;

  return server ? (
    <Stack>
      <StackItem>{getDisplayNameFromK8sResource(server)}</StackItem>
      <StackItem>
        <LabelGroup>
          {childConfigVersion && (
            <ServingRuntimeVersionLabel version={childConfigVersion} isCompact />
          )}
          {versionStatus && (
            <ServingRuntimeVersionStatus
              isOutdated={versionStatus === ServingRuntimeVersionStatusLabel.OUTDATED}
              version={childConfigVersion || ''}
              templateVersion={parentConfigVersion || ''}
            />
          )}
        </LabelGroup>
      </StackItem>
    </Stack>
  ) : (
    'Distributed inference with llm-d'
  );
};

export default LLMInferenceServiceServingDetails;
