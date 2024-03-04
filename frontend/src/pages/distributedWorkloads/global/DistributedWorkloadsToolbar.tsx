import * as React from 'react';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';
import { DistributedWorkloadsTabConfig } from './useDistributedWorkloadsTabs';

type DistributedWorkloadsToolbarProps = {
  tabConfig: DistributedWorkloadsTabConfig;
};

// TODO mturley reuse what's in MetricsPageToolbar and address the tech debt referenced in comments there

const DistributedWorkloadsToolbar: React.FC<DistributedWorkloadsToolbarProps> = ({ tabConfig }) => (
  <Toolbar>
    <ToolbarContent>
      <ToolbarItem variant="label">Project</ToolbarItem>
      <ToolbarItem spacer={{ default: 'spacerMd' }}>
        <ProjectSelectorNavigator
          getRedirectPath={(newNamespace) =>
            `/distributedWorkloads/${tabConfig.path}/${newNamespace}`
          }
        />
      </ToolbarItem>
      <ToolbarItem variant="label">Refresh interval</ToolbarItem>
      <ToolbarItem spacer={{ default: 'spacerMd' }}>TODO dropdown here</ToolbarItem>
      <ToolbarItem variant="label">Time range</ToolbarItem>
      <ToolbarItem spacer={{ default: 'spacerMd' }}>TODO dropdown here</ToolbarItem>
    </ToolbarContent>
  </Toolbar>
);
export default DistributedWorkloadsToolbar;
