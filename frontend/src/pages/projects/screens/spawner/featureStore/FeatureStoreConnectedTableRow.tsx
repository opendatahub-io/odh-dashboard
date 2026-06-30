import * as React from 'react';
import { ActionList, ActionListItem, Button, Truncate } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import type { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type FeatureStoreConnectedTableRowProps = {
  featureStore: WorkbenchFeatureStoreConfig;
  onRemove: (projectId: string) => void;
};

export const FeatureStoreConnectedTableRow: React.FC<FeatureStoreConnectedTableRowProps> = ({
  featureStore,
  onRemove,
}) => {
  const projectId = getFeatureStoreProjectId(featureStore);

  return (
    <Tr data-testid={`feature-store-connected-row-${projectId}`}>
      <Td dataLabel="Name">
        <Truncate content={featureStore.projectName} />
      </Td>
      <Td dataLabel="Namespace">
        <Truncate content={featureStore.namespace} />
      </Td>
      <Td dataLabel="Permission level">
        {featureStore.permissionLevel.length > 0 ? (
          <FeatureStorePermissionLabels permissions={featureStore.permissionLevel} />
        ) : (
          '-'
        )}
      </Td>
      <Td isActionCell>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              data-testid={`feature-store-remove-button-${projectId}`}
              aria-label={`Remove ${featureStore.projectName}`}
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
