import * as React from 'react';
import {
  HostApiContext,
  HostApiCoreContext,
  HostApiInfraContext,
  type HostApiServices,
  type HostApiCoreServices,
  type HostApiInfraServices,
} from '@odh-dashboard/plugin-core/host-api';
import { useDashboardNamespace } from '#~/redux/selectors/project';
import { useUser } from '#~/redux/selectors';
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
import { fetchClusterSettings, updateClusterSettings } from '#~/services/clusterSettingsService';
import { useTemplates } from '#~/api/k8s/templates';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import useServingConnections from '#~/pages/projects/screens/detail/connections/useServingConnections';
import {
  getDashboardConfigTemplateOrder,
  getDashboardConfigTemplateDisablement,
} from '#~/api/k8s/dashboardConfig';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import ModelServingContextProvider, {
  ModelServingContext,
} from '#~/pages/modelServing/ModelServingContext';
import ConnectionTypeFormFields from '#~/concepts/connectionTypes/fields/ConnectionTypeFormFields';

type HostApiProviderProps = {
  children: React.ReactNode;
};

const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { username } = useUser();

  const core = React.useMemo<HostApiCoreServices>(
    () => ({
      dashboardNamespace,
      checkAccess,
      trackEvent: fireMiscTrackingEvent,
      fetchDashboardConfig,
      fetchClusterSettings,
      updateClusterSettings,
    }),
    [dashboardNamespace],
  );

  const infra = React.useMemo<HostApiInfraServices>(
    () => ({
      createSecret,
      getSecret,
      deleteSecret,
      getSecretsByLabel,
      patchSecretWithOwnerReference,
      patchSecretWithProtocolAnnotation,
      createProject,
      getDashboardPvcs,
    }),
    [],
  );

  const domain = React.useMemo<HostApiServices>(
    () => ({
      useTemplates,
      setProjectServingPlatform: addSupportServingPlatformProject,
      useWatchConnectionTypes,
      useServingConnections,
      getDashboardConfigTemplateOrder,
      getDashboardConfigTemplateDisablement,
      isProjectNIMSupported,
      createProject: (displayName: string, description: string, k8sName?: string) =>
        createProject(username, displayName, description, k8sName),
      ConnectionTypeFormFields,
      contexts: {
        ProjectDetailsContext,
        ModelServingContext,
        ModelServingContextProvider,
      },
    }),
    [username],
  );

  return (
    <HostApiCoreContext.Provider value={core}>
      <HostApiInfraContext.Provider value={infra}>
        <HostApiContext.Provider value={domain}>{children}</HostApiContext.Provider>
      </HostApiInfraContext.Provider>
    </HostApiCoreContext.Provider>
  );
};

export default HostApiProvider;
