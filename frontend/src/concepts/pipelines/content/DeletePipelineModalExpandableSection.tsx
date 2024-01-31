import * as React from 'react';
import { Badge, ExpandableSection, Icon, List, ListItem, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, PendingIcon } from '@patternfly/react-icons';
import { PipelineCoreResourceKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineResourceDeleteResult } from '~/concepts/pipelines/content/useDeleteStatuses';
import { getPipelineResourceUniqueID } from './utils';

type DeletePipelineModalExpandableSectionProps = {
  toDeleteResources: PipelineCoreResourceKFv2[];
  type: 'runs' | 'pipelines' | 'pipeline versions';
  deleting: boolean;
  deleteStatuses: PipelineResourceDeleteResult[];
  children: (resource: PipelineCoreResourceKFv2) => React.ReactNode;
};

const DeletePipelineModalExpandableSection: React.FC<DeletePipelineModalExpandableSectionProps> = ({
  toDeleteResources,
  type,
  deleting,
  deleteStatuses,
  children,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  return (
    <ExpandableSection
      toggleContent={
        <>
          <span>Selected {type}</span> <Badge isRead={true}>{toDeleteResources.length}</Badge>
        </>
      }
      onToggle={(e, expanded) => setIsExpanded(expanded)}
      isExpanded={isExpanded}
      isIndented
    >
      <List isPlain className="pf-u-pl-lg">
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
      </List>
    </ExpandableSection>
  );
};

export default DeletePipelineModalExpandableSection;
