import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import PopoverListContent from './PopoverListContent';

type PropjectScopedPopoverProps = {
  title: string;
  item: string;
  description?: string;
};

const ProjectScopedPopover: React.FC<PropjectScopedPopoverProps> = ({
  title,
  item,
  description,
}) => (
  <Popover
    showClose
    hasAutoWidth
    maxWidth="370px"
    bodyContent={
      <PopoverListContent
        leadText={description}
        listHeading={`${title} accessibility`}
        listItems={[
          <span key="project-scoped">
            <strong>Project-scoped {item}</strong> are accessible only within this project.
          </span>,
          <span key="global-scoped">
            <strong>Global {item}</strong> are accessible across all projects.
          </span>,
        ]}
      />
    }
  >
    <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
  </Popover>
);

export default ProjectScopedPopover;
