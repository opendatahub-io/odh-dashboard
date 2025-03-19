import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

type PropjectScopedPopoverProps = {
  title: string;
  item: string;
};

const ProjectScopedPopover: React.FC<PropjectScopedPopoverProps> = ({ title, item }) => (
  <Popover
    bodyContent={
      <>
        <strong>{title} accessibility</strong>
        <div>
          <ul>
            <li key="project-scoped">
              <strong>Project-scoped {item}</strong> are accessible only within this project
            </li>
            <li key="global-scoped">
              <strong>Global {item}</strong> are accessible across all projects
            </li>
          </ul>
        </div>
      </>
    }
  >
    <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
  </Popover>
);

export default ProjectScopedPopover;
