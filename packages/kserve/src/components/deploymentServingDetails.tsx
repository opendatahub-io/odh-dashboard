import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  getTemplateNameFromServingRuntime,
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersion,
  findTemplateByName,
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
import ServingRuntimeVersionStatus from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionStatus';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { getServingRuntimeVersionStatus } from '@odh-dashboard/internal/pages/modelServing/utils';
import { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { K8sResourceCommon, TemplateKind } from '@odh-dashboard/k8s-core';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import type { KServeDeployment } from '../types';
import { useFetchTemplate, useFetchTemplates } from '../api/template';

const isProjectScoped = (resource?: K8sResourceCommon) =>
  resource &&
  resource.metadata?.annotations?.['opendatahub.io/serving-runtime-scope'] ===
    SERVING_RUNTIME_SCOPE.Project;

export const useServingDetailsData = (): FetchStateObject<TemplateKind[]> => {
  const { dashboardNamespace } = useDashboardNamespace();
  return useFetchTemplates(dashboardNamespace);
};

type Props = {
  deployment: KServeDeployment;
  data?: ReturnType<typeof useServingDetailsData>;
};

const DeploymentServingDetails: React.FC<Props> = ({ deployment, data }) => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const {
    data: globalTemplates,
    loaded: globalTemplatesLoaded,
    error: globalTemplatesError,
  } = data ?? {};

  const servingRuntime = deployment.server;

  const templateName = servingRuntime
    ? getTemplateNameFromServingRuntime(servingRuntime)
    : undefined;

  const globalTemplate = React.useMemo(
    () =>
      !!globalTemplates && !!templateName
        ? findTemplateByName(globalTemplates, templateName)
        : undefined,
    [templateName, globalTemplates],
  );

  const shouldCheckProject =
    (!globalTemplate && (globalTemplatesLoaded || !!globalTemplatesError)) ||
    isProjectScoped(servingRuntime);

  const {
    data: projectTemplate,
    loaded: projectTemplateLoaded,
    error: projectTemplateError,
  } = useFetchTemplate(templateName, servingRuntime?.metadata.namespace, shouldCheckProject);

  const template = globalTemplate ?? projectTemplate;
  const allLoaded = shouldCheckProject ? projectTemplateLoaded : globalTemplatesLoaded;
  const error = shouldCheckProject ? projectTemplateError : globalTemplatesError;

  const versionStatus = React.useMemo(() => {
    return getServingRuntimeVersionStatus(
      getServingRuntimeVersion(servingRuntime),
      getServingRuntimeVersion(template),
    );
  }, [template, servingRuntime]);

  const isTemplateRemoved =
    !!templateName && (allLoaded || getGenericErrorCode(error) === 404) && !template;

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
              {isProjectScopedAvailable && isProjectScoped(servingRuntime) && (
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
