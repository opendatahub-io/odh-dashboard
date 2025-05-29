import * as React from 'react';
import { Icon, ListItem, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, PendingIcon } from '@patternfly/react-icons';
import { PipelineCoreResourceKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineResourceDeleteResult } from '#~/concepts/pipelines/content/useDeleteStatuses';
import { BulkActionExpandableSection } from '#~/pages/projects/components/BulkActionExpandableSection';
import { getPipelineResourceUniqueID } from './utils';

type DeletePipelineModalExpandableSectionProps = {
  toDeleteResources: PipelineCoreResourceKF[];
  type: 'runs' | 'pipelines' | 'pipeline versions';
  deleting: boolean;
  deleteStatuses: PipelineResourceDeleteResult[];
  children: (resource: PipelineCoreResourceKF) => React.ReactNode;
};

const DeletePipelineModalExpandableSection: React.FC<DeletePipelineModalExpandableSectionProps> = ({
  toDeleteResources,
  type,
  deleting,
  deleteStatuses,
  children,
}) => (
  <BulkActionExpandableSection title={`Selected ${type}`}>
    {toDeleteResources.map((resource, i) => {
      let icon: React.ReactNode;
      if (!deleting) {
        icon = null;
      } else {
        const state = deleteStatuses[i];
        if (state === undefined) {
          icon = <PendingIcon />;
        } else if (state === true) {
          icon = (
            <Icon status="success">
              <CheckCircleIcon />
            </Icon>
          );
        } else {
          icon = (
            <Tooltip content={state.message}>
              <Icon status="danger">
                <ExclamationCircleIcon />
              </Icon>
            </Tooltip>
          );
        }
      }

      const key = getPipelineResourceUniqueID(resource);
      return (
        <ListItem key={key} icon={icon}>
          {children(resource)}
        </ListItem>
      );
    })}
  </BulkActionExpandableSection>
);

export default DeletePipelineModalExpandableSection;
