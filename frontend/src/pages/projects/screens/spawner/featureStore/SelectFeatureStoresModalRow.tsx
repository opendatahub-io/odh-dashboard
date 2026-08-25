import * as React from 'react';
import { Content, Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

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
          <Content
            className="pf-v6-u-text-color-disabled"
            data-testid="feature-store-unavailable-name"
          >
            <Truncate content={featureStore.projectName} />
          </Content>
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
