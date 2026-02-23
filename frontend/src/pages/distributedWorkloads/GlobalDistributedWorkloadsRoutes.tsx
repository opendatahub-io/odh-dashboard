import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';

import { useDistributedWorkloadsTabs } from '#~/pages/distributedWorkloads/global/useDistributedWorkloadsTabs';
import GlobalDistributedWorkloads from '#~/pages/distributedWorkloads/global/GlobalDistributedWorkloads';
import NotFound from '#~/pages/NotFound';
import { buildV2RedirectRoutes } from '#~/utilities/v2Redirect';
import { v2RedirectMap } from './v2Redirects';

const GlobalDistributedWorkloadsRoutes: React.FC = () => {
  const tabs = useDistributedWorkloadsTabs();
  const firstAvailableTab = tabs.find((tab) => tab.isAvailable);

  return (
    <ProjectsRoutes>
      {firstAvailableTab && (
        <Route index element={<Navigate to={firstAvailableTab.path} replace />} />
      )}
      {tabs
        .filter((tab) => tab.isAvailable)
        .map((tab) => (
          <Route
            key={tab.id}
            path={`${tab.path}/:namespace?`}
            element={
              <GlobalDistributedWorkloads
                activeTab={tab}
                getInvalidRedirectPath={(namespace) =>
                  `/observe-monitor/workload-metrics/${tab.path}/${namespace}`
                }
              />
            }
          />
        ))}
      {buildV2RedirectRoutes(v2RedirectMap)}
      <Route path="*" element={<NotFound />} />
    </ProjectsRoutes>
  );
};

export default GlobalDistributedWorkloadsRoutes;
