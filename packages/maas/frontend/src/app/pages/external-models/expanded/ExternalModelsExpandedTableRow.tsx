import * as React from 'react';
import { ExpandableRowContent, Td, Tr } from '@patternfly/react-table';
import { Label, Button } from '@patternfly/react-core';
import { Table } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ExternalModel, ProviderRef } from '~/app/types/external-models';
import { getProviderRefResource } from '~/app/pages/external-models/providerRefUtils';
import { ExternalModelsExpandedRowColumns } from './columns';

type ExternalModelsExpandedTableRowProps = {
  externalModel: ExternalModel;
  setProviderURLModalRef: (providerRef: ProviderRef) => void;
  setPathModalRef: (providerRef: ProviderRef) => void;
};

const ExternalModelsExpandedTableRow: React.FC<ExternalModelsExpandedTableRowProps> = ({
  externalModel,
  setProviderURLModalRef,
  setPathModalRef,
}) => (
  <ExpandableRowContent>
    <Table
      data={externalModel.providerRefs}
      columns={ExternalModelsExpandedRowColumns}
      rowRenderer={(row: ProviderRef) => (
        <Tr>
          <Td>
            <TableRowTitleDescription
              title={<Label color="blue">{row.provider?.displayName ?? row.providerName}</Label>}
              resource={getProviderRefResource(row)}
            />
          </Td>
          <Td>
            <Button variant="link" isInline onClick={() => setProviderURLModalRef(row)}>
              View URL
            </Button>
          </Td>
          <Td>
            <Button variant="link" isInline onClick={() => setPathModalRef(row)}>
              View Path
            </Button>
          </Td>
          <Td>{row.provider?.authMechanism}</Td>
          <Td>{row.provider?.credentialSecretRef}</Td>
          <Td>
            <Label color="grey" variant="outline" isCompact>
              {row.apiFormat}
            </Label>
          </Td>
          <Td>{row.targetModel}</Td>
          <Td>{row.weight}</Td>
        </Tr>
      )}
    />
  </ExpandableRowContent>
);

export default ExternalModelsExpandedTableRow;
