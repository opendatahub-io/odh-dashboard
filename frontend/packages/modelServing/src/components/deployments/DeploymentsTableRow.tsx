import React from 'react';
import { Td, ActionsColumn, Tbody } from '@patternfly/react-table';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { DeploymentEndpointsPopupButton } from './DeploymentEndpointsPopupButton';
import { DeploymentRowExpandedSection } from './DeploymentsTableRowExpandedSection';
import {
  useDeploymentExtension,
  useResolvedDeploymentExtension,
} from '../../concepts/extensionUtils';
import { getServerApiProtocol } from '../../concepts/deploymentUtils';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingAuthExtension,
  isModelServingDeploymentResourcesExtension,
  isModelServingDeploymentsExpandedInfo,
  isModelServingMetricsExtension,
} from '../../../extension-points';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
  onDelete: (deployment: Deployment) => void;
  rowIndex: number;
  showExpandedInfo?: boolean;
}> = ({ deployment, platformColumns, onDelete, rowIndex, showExpandedInfo }) => {
  const metricsExtension = useDeploymentExtension(isModelServingMetricsExtension, deployment);
  // Loads instantly so we know if the row is expandable
  const detailsExtension = useDeploymentExtension(
    isModelServingDeploymentsExpandedInfo,
    deployment,
  );

  const [resolvedResourcesExtension] = useResolvedDeploymentExtension(
    isModelServingDeploymentResourcesExtension,
    deployment,
  );
  const [resolvedExpandedInfoExtension] = useResolvedDeploymentExtension(
    isModelServingDeploymentsExpandedInfo,
    deployment,
  );
  const [resolvedAuthExtension] = useResolvedDeploymentExtension(
    isModelServingAuthExtension,
    deployment,
  );

  const [isExpanded, setExpanded] = React.useState(false);

  return (
    <Tbody isExpanded={isExpanded}>
      <ResourceTr resource={deployment.model}>
        {detailsExtension && showExpandedInfo && (
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
            {metricsExtension &&
            deployment.model.metadata.namespace &&
            deployment.status?.state === InferenceServiceModelState.LOADED ? (
              <Link
                to={`/projects/${deployment.model.metadata.namespace}/metrics/model/${deployment.model.metadata.name}`}
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
          {deployment.status?.state === InferenceServiceModelState.LOADING ||
          deployment.status?.state === InferenceServiceModelState.PENDING ? (
            'Pending...'
          ) : deployment.status?.state === InferenceServiceModelState.FAILED_TO_LOAD ? (
            '-'
          ) : (
            <DeploymentEndpointsPopupButton endpoints={deployment.endpoints} loading={false} />
          )}
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
      {isExpanded &&
        showExpandedInfo &&
        resolvedResourcesExtension &&
        resolvedExpandedInfoExtension &&
        resolvedAuthExtension && (
          <DeploymentRowExpandedSection
            deployment={deployment}
            useResources={resolvedResourcesExtension.properties.useResources}
            useFramework={resolvedExpandedInfoExtension.properties.useFramework}
            useReplicas={resolvedExpandedInfoExtension.properties.useReplicas}
            usePlatformAuth={resolvedAuthExtension.properties.usePlatformAuthEnabled}
          />
        )}
    </Tbody>
  );
};
