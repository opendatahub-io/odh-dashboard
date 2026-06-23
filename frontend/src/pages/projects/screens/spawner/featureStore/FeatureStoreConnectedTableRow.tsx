import * as React from 'react';
import { ActionList, ActionListItem, Button, Truncate } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import type { FeatureStoreProject } from '#~/api/featureStore/custom';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type FeatureStoreConnectedTableRowProps = {
  project: FeatureStoreProject;
  onRemove: (projectId: string) => void;
};

export const FeatureStoreConnectedTableRow: React.FC<FeatureStoreConnectedTableRowProps> = ({
  project,
  onRemove,
}) => {
  const projectId = getFeatureStoreProjectId(project);

  return (
    <Tr data-testid={`feature-store-connected-row-${projectId}`}>
      <Td dataLabel="Name">
        <Truncate content={project.feastProjectName} />
      </Td>
      <Td dataLabel="Namespace">
        <Truncate content={project.namespace} />
      </Td>
      <Td dataLabel="Description">
        {project.description ? <Truncate content={project.description} /> : '-'}
      </Td>
      <Td dataLabel="Permission level">
        {project.permissionLevel.length > 0 ? (
          <FeatureStorePermissionLabels permissions={project.permissionLevel} />
        ) : (
          '-'
        )}
      </Td>
      <Td isActionCell>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              data-testid={`feature-store-remove-button-${projectId}`}
              aria-label={`Remove ${project.feastProjectName}`}
              variant="plain"
              onClick={() => onRemove(projectId)}
            >
              <MinusCircleIcon />
            </Button>
          </ActionListItem>
        </ActionList>
      </Td>
    </Tr>
  );
};

export default FeatureStoreConnectedTableRow;
