import * as React from 'react';
import { HostApiContext, type HostApiServices } from '@odh-dashboard/plugin-core/host-api';
import { useDashboardNamespace } from '#~/redux/selectors/project';
import { checkAccess } from '#~/api/checkAccess';
import {
  getSecretsByLabel,
  createSecret,
  getSecret,
  deleteSecret,
  patchSecretWithOwnerReference,
  patchSecretWithProtocolAnnotation,
} from '#~/api/k8s/secrets';
import { getDashboardPvcs } from '#~/api/k8s/pvcs';
import { addSupportServingPlatformProject, createProject } from '#~/api/k8s/projects';
import { fetchDashboardConfig } from '#~/services/dashboardConfigService';
import { useTemplates } from '#~/api/k8s/templates';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import useServingConnections from '#~/pages/projects/screens/detail/connections/useServingConnections';
import {
  getDashboardConfigTemplateOrder,
  getDashboardConfigTemplateDisablement,
} from '#~/api/k8s/dashboardConfig';
import { useModelServingMetrics } from '#~/api/prometheus/serving';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { registeredModelDeploymentsRoute } from '#~/routes/modelRegistry/registeredModels';

type HostApiProviderProps = {
  children: React.ReactNode;
};

const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();

  const value = React.useMemo<HostApiServices>(
    () => ({
      dashboardNamespace,
      checkAccess,
      getSecretsByLabel,
      getDashboardPvcs,
      fetchDashboardConfig,
      useTemplates,
      setProjectServingPlatform: addSupportServingPlatformProject,
      createSecret,
      getSecret,
      deleteSecret,
      patchSecretWithOwnerReference,
      patchSecretWithProtocolAnnotation,
      useWatchConnectionTypes,
      useServingConnections,
      getDashboardConfigTemplateOrder,
      getDashboardConfigTemplateDisablement,
      useModelServingMetrics:
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge uses generic string params; concrete enum types are structurally compatible
        useModelServingMetrics as unknown as HostApiServices['useModelServingMetrics'],
      useServingPlatformStatuses,
      isProjectNIMSupported,
      trackEvent: fireMiscTrackingEvent,
      createProject,
      registeredModelDeploymentsRoute,
    }),
    [dashboardNamespace],
  );

  return <HostApiContext.Provider value={value}>{children}</HostApiContext.Provider>;
};

export default HostApiProvider;
