import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  getTemplateNameFromServingRuntime,
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersion,
} from '@odh-dashboard/model-serving/shared';
import { LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import { renderDeploymentResourceVersionLabels } from '@odh-dashboard/model-serving/shared/components';
import ScopedLabel from '@odh-dashboard/ui-core/components/ScopedLabel';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import {
  SERVING_RUNTIME_SCOPE,
  ServingRuntimeVersionStatusLabel,
} from '@odh-dashboard/internal/pages/modelServing/screens/const';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ServingRuntimeTemplateStatus from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeTemplateStatus';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useTemplateByName } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/useTemplateByName';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ServingRuntimeVersionStatus from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionStatus';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { getServingRuntimeVersionStatus } from '@odh-dashboard/internal/pages/modelServing/utils';
import type { KServeDeployment } from '../types';

type Props = {
  deployment: KServeDeployment;
};

const DeploymentServingDetails: React.FC<Props> = ({ deployment }) => {
  const servingRuntime = deployment.server;
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const templateName = servingRuntime
    ? getTemplateNameFromServingRuntime(servingRuntime)
    : undefined;

  const [template, templateLoaded, templateError] = useTemplateByName(templateName);

  const versionStatus = React.useMemo(() => {
    if (templateLoaded && !templateError && servingRuntime) {
      const servingRuntimeVersion = getServingRuntimeVersion(servingRuntime);
      const templateVersion = getServingRuntimeVersion(template);
      return getServingRuntimeVersionStatus(servingRuntimeVersion, templateVersion);
    }
    return undefined;
  }, [template, templateLoaded, templateError, servingRuntime]);

  const isTemplateRemoved = templateLoaded && !templateError && !template && !!templateName;

  return (
    <>
      {servingRuntime ? (
        <Stack>
          <StackItem>{getDisplayNameFromServingRuntimeTemplate(servingRuntime)}</StackItem>
          <StackItem>
            <LabelGroup numLabels={5}>
              {renderDeploymentResourceVersionLabels(servingRuntime, { isCompact: true })}
              {versionStatus && (
                <ServingRuntimeVersionStatus
                  isOutdated={versionStatus === ServingRuntimeVersionStatusLabel.OUTDATED}
                  version={getServingRuntimeVersion(servingRuntime) || ''}
                  templateVersion={getServingRuntimeVersion(template) || ''}
                />
              )}
              {isTemplateRemoved && <ServingRuntimeTemplateStatus />}
              {isProjectScopedAvailable &&
                servingRuntime.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
                  SERVING_RUNTIME_SCOPE.Project && (
                  <ScopedLabel isProject color="blue" isCompact>
                    Project-scoped
                  </ScopedLabel>
                )}
            </LabelGroup>
          </StackItem>
        </Stack>
      ) : (
        'Unknown'
      )}
    </>
  );
};

export default DeploymentServingDetails;
