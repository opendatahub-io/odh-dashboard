import React from 'react';
import { Td, ActionsColumn } from '@patternfly/react-table';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { TableRowTitleDescription } from '@odh-dashboard/internal/components/table/index';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { DeploymentEndpointsPopupButton } from './DeploymentEndpointsPopupButton';
import { getServerApiProtocol } from '../../concepts/deploymentUtils';
import { Deployment, DeploymentsTableColumn } from '../../../extension-points';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
  onDelete: (deployment: Deployment) => void;
}> = ({ deployment, platformColumns, onDelete }) => (
  <ResourceTr resource={deployment.model}>
    <Td dataLabel="Name">
      <TableRowTitleDescription
        title={getDisplayNameFromK8sResource(deployment.model)}
        resource={deployment.model}
      />
    </Td>
    {platformColumns.map((column) => (
      <Td key={column.field} dataLabel={column.label}>
        {column.cellRenderer(deployment, column.field)}
      </Td>
    ))}
    <Td dataLabel="Inference endpoint">
      <DeploymentEndpointsPopupButton
        endpoints={deployment.endpoints}
        loading={deployment.status?.state === InferenceServiceModelState.LOADING}
      />
    </Td>
    <Td dataLabel="API protocol">
      {getServerApiProtocol(deployment) ? (
        <Label color="yellow">{getServerApiProtocol(deployment)}</Label>
      ) : (
        <Content component={ContentVariants.small}>Not defined</Content>
      )}
    </Td>
    <Td dataLabel="Status">
      <ModelStatusIcon
        state={deployment.status?.state ?? InferenceServiceModelState.UNKNOWN}
        bodyContent={deployment.status?.message}
        defaultHeaderContent="Inference Service Status"
      />
    </Td>
    <Td isActionCell>
      <ActionsColumn
        items={[
          {
            title: 'Delete',
            onClick: () => {
              onDelete(deployment);
            },
          },
        ]}
      />
    </Td>
  </ResourceTr>
);
