import React from 'react';
import { Td, ActionsColumn } from '@patternfly/react-table';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { DeploymentEndpointsPopupButton } from './DeploymentEndpointsPopupButton';
import { DeploymentRowExpandedSection } from './DeploymentsTableRowExpandedSection';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';
import { getServerApiProtocol } from '../../concepts/deploymentUtils';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingDeploymentsExpandedInfo,
  ModelServingMetricsExtension,
} from '../../../extension-points';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
  onDelete: (deployment: Deployment) => void;
  rowIndex: number;
  metricsExtension?: ModelServingMetricsExtension;
}> = ({ deployment, platformColumns, onDelete, rowIndex, metricsExtension }) => {
  const [detailsExtension] = useResolvedDeploymentExtension(
    isModelServingDeploymentsExpandedInfo,
    deployment,
  );

  const [isExpanded, setExpanded] = React.useState(false);

  return (
    <>
      <ResourceTr resource={deployment.model}>
        {detailsExtension && (
          <Td
            expand={{
              rowIndex,
              expandId: `${deployment.modelServingPlatformId}-model-row-item`,
              isExpanded,
              onToggle: () => setExpanded(!isExpanded),
            }}
          />
        )}
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={deployment.model}>
            {metricsExtension && deployment.model.metadata.namespace ? (
              <Link
                data-testid={`metrics-link-${getDisplayNameFromK8sResource(deployment.model)}`}
                to={`/projects/${encodeURIComponent(
                  deployment.model.metadata.namespace,
                )}/metrics/model/${encodeURIComponent(deployment.model.metadata.name)}`}
              >
                {getDisplayNameFromK8sResource(deployment.model)}
              </Link>
            ) : (
              getDisplayNameFromK8sResource(deployment.model)
            )}
          </ResourceNameTooltip>
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
      {isExpanded && detailsExtension && (
        <DeploymentRowExpandedSection deployment={deployment} expandedInfo={detailsExtension} />
      )}
    </>
  );
};
