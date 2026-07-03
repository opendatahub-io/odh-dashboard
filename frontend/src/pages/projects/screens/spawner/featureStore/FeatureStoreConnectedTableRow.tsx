import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ActionList,
  ActionListItem,
  Button,
  Flex,
  FlexItem,
  Icon,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { InfoCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';
import { FEATURE_STORE_UNAVAILABLE_TOOLTIP } from './utils';

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
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Truncate content={featureStore.projectName} />
            </FlexItem>
            <FlexItem>
              <Tooltip content={FEATURE_STORE_UNAVAILABLE_TOOLTIP}>
                <Icon isInline status="info" data-testid="feature-store-unavailable-icon">
                  <InfoCircleIcon />
                </Icon>
              </Tooltip>
            </FlexItem>
          </Flex>
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
      <Td dataLabel="Namespace">
        <Truncate content={featureStore.isUnavailable ? '-' : featureStore.namespace} />
      </Td>
      <Td dataLabel="Permission level">
        {!featureStore.isUnavailable && featureStore.permissionLevel.length > 0 ? (
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
