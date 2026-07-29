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
import { addSupportServingPlatformProject } from '#~/api/k8s/projects';
import { fetchDashboardConfig } from '#~/services/dashboardConfigService';
import { useTemplates } from '#~/api/k8s/templates';

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
    }),
    [dashboardNamespace],
  );

  return <HostApiContext.Provider value={value}>{children}</HostApiContext.Provider>;
};

export default HostApiProvider;
