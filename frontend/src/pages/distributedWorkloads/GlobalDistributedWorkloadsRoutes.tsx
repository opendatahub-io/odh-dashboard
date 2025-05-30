import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';

import { useDistributedWorkloadsTabs } from '#~/pages/distributedWorkloads/global/useDistributedWorkloadsTabs';
import GlobalDistributedWorkloads from '#~/pages/distributedWorkloads/global/GlobalDistributedWorkloads';
import NotFound from '#~/pages/NotFound';

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
                  `/distributedWorkloads/${tab.path}/${namespace}`
                }
              />
            }
          />
        ))}
      <Route path="*" element={<NotFound />} />
    </ProjectsRoutes>
  );
};

export default GlobalDistributedWorkloadsRoutes;
