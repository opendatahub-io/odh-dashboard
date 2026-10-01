import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- The host composition root supplies the serving hub's domain adapter.
import {
  GatewayDiscoveryContext,
  gatewayDiscoveryServices,
} from '@odh-dashboard/model-serving/api/gatewayDiscovery';
import {
  HostApiContext,
  HostApiCoreContext,
  HostApiInfraContext,
  PluginCapabilities,
  type HostApiServices,
  type HostApiCoreServices,
  type HostApiInfraServices,
} from '@odh-dashboard/plugin-core/host-api';
import {
  getSecretsByLabel,
  createSecret,
  getSecret,
  deleteSecret,
} from '@odh-dashboard/k8s-core/api/secrets';
import { checkAccessStrict } from '@odh-dashboard/k8s-core/api/accessReview';
import { discoverK8sResource } from '@odh-dashboard/k8s-core/api/discovery';
import { useDashboardNamespace } from '#~/redux/selectors/project';
import { useUser } from '#~/redux/selectors';
import { checkAccess } from '#~/api/checkAccess';
import {
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

/** Mount below ProjectsContextProvider; namespace candidates never imply permission. */
export const HostCapabilities: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { projects, loaded, loadError } = React.useContext(ProjectsContext);
  const namespaceCandidates = useDeepCompareMemoize({
    namespaces: [...new Set(projects.map((project) => project.metadata.name))].toSorted(),
    loaded,
    error: loadError,
  });
  return (
    <PluginCapabilities
      namespaceCandidates={namespaceCandidates}
      fallback={
        <Bullseye>
          <Spinner />
        </Bullseye>
      }
    >
      {children}
    </PluginCapabilities>
  );
};

const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { username } = useUser();

  const core = React.useMemo<HostApiCoreServices>(
    () => ({
      dashboardNamespace,
      checkAccess,
      reviewAccess: checkAccessStrict,
      discoverResource: discoverK8sResource,
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
        <HostApiContext.Provider value={domain}>
          <GatewayDiscoveryContext.Provider value={gatewayDiscoveryServices}>
            {children}
          </GatewayDiscoveryContext.Provider>
        </HostApiContext.Provider>
      </HostApiInfraContext.Provider>
    </HostApiCoreContext.Provider>
  );
};

export default HostApiProvider;
