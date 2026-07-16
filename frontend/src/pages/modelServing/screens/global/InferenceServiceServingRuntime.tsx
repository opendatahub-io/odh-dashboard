import { LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersion,
  getTemplateNameFromServingRuntime,
} from '@odh-dashboard/model-serving/shared';
import { ServingRuntimeVersionLabel } from '@odh-dashboard/model-serving/shared/components';
import ScopedLabel from '@odh-dashboard/ui-core/components/ScopedLabel';
import {
  SERVING_RUNTIME_SCOPE,
  ServingRuntimeVersionStatusLabel,
} from '#~/pages/modelServing/screens/const';
import ServingRuntimeTemplateStatus from '#~/pages/modelServing/screens/ServingRuntimeTemplateStatus';
import { useTemplateByName } from '#~/pages/modelServing/customServingRuntimes/useTemplateByName';
import ServingRuntimeVersionStatus from '#~/pages/modelServing/screens/ServingRuntimeVersionStatus';
import { getServingRuntimeVersionStatus } from '#~/pages/modelServing/utils';

type Props = {
  servingRuntime?: ServingRuntimeKind;
};

const InferenceServiceServingRuntime: React.FC<Props> = ({ servingRuntime }) => {
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
            <LabelGroup>
              {getServingRuntimeVersion(servingRuntime) && (
                <ServingRuntimeVersionLabel
                  version={getServingRuntimeVersion(servingRuntime)}
                  isCompact
                />
              )}
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
export default InferenceServiceServingRuntime;
