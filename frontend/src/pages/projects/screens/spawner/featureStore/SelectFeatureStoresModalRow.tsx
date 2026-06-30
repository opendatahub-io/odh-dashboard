import * as React from 'react';
import { Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import type { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type SelectFeatureStoresModalRowProps = {
  rowIndex: number;
  featureStore: WorkbenchFeatureStoreConfig;
  isSelected: boolean;
  isAlreadyConnected: boolean;
  onToggle: (featureStore: WorkbenchFeatureStoreConfig) => void;
};

export const SelectFeatureStoresModalRow: React.FC<SelectFeatureStoresModalRowProps> = ({
  rowIndex,
  featureStore,
  isSelected,
  isAlreadyConnected,
  onToggle,
}) => {
  const projectId = getFeatureStoreProjectId(featureStore);

  return (
    <Tr data-testid={`select-feature-stores-row-${projectId}`}>
      <Td
        select={{
          rowIndex,
          isSelected: isAlreadyConnected || isSelected,
          isDisabled: isAlreadyConnected,
          onSelect: () => {
            if (!isAlreadyConnected) {
              onToggle(featureStore);
            }
          },
        }}
        aria-label={`Toggle ${featureStore.projectName}`}
      />
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
    </Tr>
  );
};

export default SelectFeatureStoresModalRow;
