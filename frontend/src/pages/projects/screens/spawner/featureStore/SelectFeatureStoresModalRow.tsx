import * as React from 'react';
import { Flex, FlexItem, Icon, Tooltip, Truncate } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';
import { FEATURE_STORE_UNAVAILABLE_TOOLTIP } from './utils';

export type SelectFeatureStoresModalRowProps = {
  rowIndex: number;
  featureStore: SelectedFeatureStoreConfig;
  isSelected: boolean;
  onToggle: (featureStore: SelectedFeatureStoreConfig) => void;
};

export const SelectFeatureStoresModalRow: React.FC<SelectFeatureStoresModalRowProps> = ({
  rowIndex,
  featureStore,
  isSelected,
  onToggle,
}) => {
  const projectId = getFeatureStoreProjectId(featureStore);

  return (
    <Tr data-testid={`select-feature-stores-row-${projectId}`}>
      <Td
        select={{
          rowIndex,
          isSelected,
          onSelect: () => onToggle(featureStore),
        }}
        aria-label={`Toggle ${featureStore.projectName}`}
      />
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
    </Tr>
  );
};

export default SelectFeatureStoresModalRow;
