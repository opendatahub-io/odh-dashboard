import React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import type { SecretKind } from '#~/k8sTypes';
import { Table, SortableData } from '#~/components/table';
import { ColumnField } from '#~/pages/modelServing/screens/global/data';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import ServingRuntimeTokenTableRow from './ServingRuntimeTokenTableRow';

export const tokenColumns: SortableData<SecretKind>[] = [
  {
    field: ColumnField.Name,
    label: 'Token name',
    width: 20,
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    field: ColumnField.Token,
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
