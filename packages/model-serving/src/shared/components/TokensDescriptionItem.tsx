import React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { Table, SortableData } from '@odh-dashboard/ui-core';
import ServingRuntimeTokenTableRow from './ServingRuntimeTokenTableRow';

export const tokenColumns: SortableData<SecretKind>[] = [
  {
    field: 'name',
    label: 'Token name',
    width: 20,
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    field: 'token',
    label: 'Token secret',
    width: 80,
    sortable: false,
  },
];

export const TokensDescriptionItem: React.FC<{
  tokens: SecretKind[];
  isTokenEnabled: boolean;
  loaded: boolean;
  error: Error | undefined;
}> = ({ tokens, isTokenEnabled, loaded, error }) => {
  if (!isTokenEnabled) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">Tokens disabled</HelperTextItem>
      </HelperText>
    );
  }

  return (
    <Table
      data={tokens}
      columns={tokenColumns}
      rowRenderer={(secret: SecretKind) => (
        <ServingRuntimeTokenTableRow
          key={secret.metadata.uid}
          obj={secret}
          loaded={loaded}
          error={error}
        />
      )}
    />
  );
};
