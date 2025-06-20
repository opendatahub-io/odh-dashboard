import { LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { ServingRuntimeKind } from '#~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersion,
  getTemplateNameFromServingRuntime,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import {
  SERVING_RUNTIME_SCOPE,
  ServingRuntimeVersionStatusLabel,
} from '#~/pages/modelServing/screens/const';
import ServingRuntimeVersionLabel from '#~/pages/modelServing/screens/ServingRuntimeVersionLabel';
import ScopedLabel from '#~/components/ScopedLabel';
import { useTemplateByName } from '#~/pages/modelServing/customServingRuntimes/useTemplateByName';
import ServingRuntimeVersionStatus from '#~/pages/modelServing/screens/ServingRuntimeVersionStatus';

type Props = {
  servingRuntime?: ServingRuntimeKind;
  isProjectScoped?: boolean;
};

const InferenceServiceServingRuntime: React.FC<Props> = ({ servingRuntime, isProjectScoped }) => {
  const [versionStatus, setVersionStatus] = React.useState<string | undefined>(undefined);
  const templateName = servingRuntime
    ? getTemplateNameFromServingRuntime(servingRuntime)
    : undefined;

  const [template, templateLoaded, templateError] = useTemplateByName(templateName);

  React.useEffect(() => {
    if (templateLoaded && !templateError && servingRuntime) {
      const servingRuntimeVersion = getServingRuntimeVersion(servingRuntime);
      const templateVersion = getServingRuntimeVersion(template);
      if (!servingRuntimeVersion || !templateVersion) {
        setVersionStatus(undefined);
      } else if (servingRuntimeVersion === templateVersion) {
        setVersionStatus(ServingRuntimeVersionStatusLabel.LATEST);
      } else {
        setVersionStatus(ServingRuntimeVersionStatusLabel.OUTDATED);
      }
    }
  }, [template, templateLoaded, templateError, servingRuntime]);

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
              {isProjectScoped &&
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
