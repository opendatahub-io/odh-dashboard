import * as React from 'react';
import { Link } from 'react-router-dom';
import { ActionList, ActionListItem, Button, Content, Truncate } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type FeatureStoreConnectedTableRowProps = {
  featureStore: SelectedFeatureStoreConfig;
  availabilityLoaded: boolean;
  onRemove: (projectId: string) => void;
};

export const FeatureStoreConnectedTableRow: React.FC<FeatureStoreConnectedTableRowProps> = ({
  featureStore,
  availabilityLoaded,
  onRemove,
}) => {
  const projectId = getFeatureStoreProjectId(featureStore);

  return (
    <Tr data-testid={`feature-store-connected-row-${projectId}`}>
      <Td dataLabel="Name">
        {featureStore.isUnavailable ? (
          <Content
            className="pf-v6-u-text-color-disabled"
            data-testid="feature-store-unavailable-name"
          >
            <Truncate content={featureStore.projectName} />
          </Content>
        ) : availabilityLoaded ? (
          <Link
            to={`/develop-train/feature-store/overview/${featureStore.projectName}`}
            state={{ registryNamespace: featureStore.namespace }}
            data-testid={`feature-store-link-${featureStore.projectName}`}
          >
            <Truncate content={featureStore.projectName} />
          </Link>
        ) : (
          <Truncate content={featureStore.projectName} />
        )}
      </Td>
      <Td dataLabel="Project">
        <Truncate content={featureStore.isUnavailable ? '-' : featureStore.namespace} />
      </Td>
      <Td dataLabel="Permissions">
        {!featureStore.isUnavailable && featureStore.permissions.length > 0 ? (
          <FeatureStorePermissionLabels permissions={featureStore.permissions} />
        ) : (
          '-'
        )}
      </Td>
      <Td isActionCell>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              data-testid={`feature-store-remove-button-${projectId}`}
              aria-label={`Remove ${featureStore.namespace}/${featureStore.projectName}`}
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
