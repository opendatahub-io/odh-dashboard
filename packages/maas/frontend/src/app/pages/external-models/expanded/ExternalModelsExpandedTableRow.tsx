import * as React from 'react';
import { ExpandableRowContent, Td, Tr } from '@patternfly/react-table';
import { Label, Button } from '@patternfly/react-core';
import { Table } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ExternalModel, ProviderRef } from '~/app/types/external-models';
import {
  mapAuthMechanismToHumanReadable,
  getProviderRefResource,
} from '~/app/pages/external-models/utils';
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
        <Tr data-testid={`expanded-provider-row-${row.providerName}`}>
          <Td>
            <TableRowTitleDescription
              title={
                <Label
                  color="blue"
                  data-testid={`expanded-table-row-provider-name-${row.providerName}`}
                >
                  {row.provider?.displayName ?? row.providerName}
                </Label>
              }
              resource={getProviderRefResource(row)}
            />
          </Td>
          <Td>
            <Button
              variant="link"
              isInline
              onClick={() => setProviderURLModalRef(row)}
              data-testid={`expanded-table-row-view-url-button-${row.providerName}`}
            >
              View URL
            </Button>
          </Td>
          <Td>
            <Button
              variant="link"
              isInline
              onClick={() => setPathModalRef(row)}
              data-testid={`expanded-table-row-view-path-button-${row.providerName}`}
            >
              View Path
            </Button>
          </Td>
          <Td data-testid={`expanded-table-row-auth-mechanism-${row.providerName}`}>
            {row.provider && mapAuthMechanismToHumanReadable(row.provider.authMechanism)}
          </Td>
          <Td data-testid={`expanded-table-row-credential-secret-ref-${row.providerName}`}>
            {row.provider?.credentialSecretRef}
          </Td>
          <Td>
            <Label
              color="grey"
              variant="outline"
              isCompact
              data-testid={`expanded-table-row-api-format-${row.providerName}`}
            >
              {row.apiFormat}
            </Label>
          </Td>
          <Td data-testid={`expanded-table-row-target-model-${row.providerName}`}>
            {row.targetModel}
          </Td>
          <Td data-testid={`expanded-table-row-weight-${row.providerName}`}>{row.weight}</Td>
        </Tr>
      )}
    />
  </ExpandableRowContent>
);

export default ExternalModelsExpandedTableRow;
