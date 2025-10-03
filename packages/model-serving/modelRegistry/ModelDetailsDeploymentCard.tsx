import React from 'react';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Divider,
  Flex,
  FlexItem,
  List,
  ListItem,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import TypedObjectIcon from '@odh-dashboard/internal/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import DeploymentLastDeployed from '../src/components/deployments/DeploymentLastDeployed';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';
import { Deployment, isModelServingMetricsExtension } from '../extension-points';
import { DeploymentMetricsLink } from '../src/components/metrics/DeploymentMetricsLink';
import { useDeploymentExtension } from '../src/concepts/extensionUtils';
import { deploymentLastDeployedSort } from '../src/concepts/deploymentUtils';

const DeploymentCardContent: React.FC<{ deployment: Deployment }> = ({ deployment }) => {
  const metricsExtension = useDeploymentExtension(isModelServingMetricsExtension, deployment);

  return (
    <ListItem key={deployment.model.metadata.name} className="pf-v6-u-py-md">
      <Split hasGutter style={{ alignItems: 'center' }}>
        <SplitItem>
          <ModelStatusIcon
            state={deployment.status?.state ?? ModelDeploymentState.UNKNOWN}
            bodyContent={deployment.status?.message}
            stoppedStates={deployment.status?.stoppedStates}
            hideLabel
          />
        </SplitItem>
        <SplitItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
            <FlexItem>
              {metricsExtension &&
              deployment.model.metadata.namespace &&
              (deployment.status?.stoppedStates?.isRunning ||
                deployment.status?.stoppedStates?.isStopped) ? (
                <DeploymentMetricsLink deployment={deployment} />
              ) : (
                <span data-testid="deployed-model-name">
                  {getDisplayNameFromK8sResource(deployment.model)}
                </span>
              )}
            </FlexItem>
            <FlexItem>
              <Flex
                spaceItems={{ default: 'spaceItemsXs' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem style={{ display: 'flex' }}>
                  <TypedObjectIcon
                    resourceType={ProjectObjectType.project}
                    style={{ height: 16, width: 16 }}
                  />
                </FlexItem>
                <FlexItem>
                  <Truncate maxCharsDisplayed={20} content={deployment.model.metadata.namespace} />
                </FlexItem>
                <FlexItem>
                  <DeploymentLastDeployed deployment={deployment} />
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </SplitItem>
      </Split>
    </ListItem>
  );
};

const DeploymentCard: React.FC<{
  rmId: string | undefined;
  preferredModelRegistry: string | undefined;
}> = ({ rmId = '', preferredModelRegistry = '' }) => {
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const latestDeployments = React.useMemo(() => {
    if (!deployments) return [];
    return deployments.toSorted((a, b) => deploymentLastDeployedSort(a, b)).slice(0, 5);
  }, [deployments]);

  if (!deploymentsLoaded) {
    return (
      <CardBody>
        <Divider />
        <Bullseye>Loading latest deployments...</Bullseye>
      </CardBody>
    );
  }

  return (
    <CardBody>
      <Divider />
      {latestDeployments.length === 0 ? (
        <div className="pf-v6-u-pt-md" data-testid="no-versions-text">
          No deployments
        </div>
      ) : (
        <List isPlain isBordered>
          {latestDeployments.map((deployment) => (
            <DeploymentCardContent
              deployment={deployment}
              key={`${deployment.model.metadata.namespace}/${deployment.model.metadata.name}`}
            />
          ))}
          {deployments && deployments.length > 0 && (
            <ListItem className="pf-v6-u-pt-md">
              <Link
                to={`/model-registry/${preferredModelRegistry}/registeredModels/${rmId}/deployments`}
              >
                <Button isInline variant="link" icon={<ArrowRightIcon />} iconPosition="right">
                  {`View all ${deployments.length} deployments`}
                </Button>
              </Link>
            </ListItem>
          )}
        </List>
      )}
    </CardBody>
  );
};

const ModelDetailsDeploymentCard: React.FC<{ rmId?: string; mrName?: string }> = ({
  rmId,
  mrName,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const labelSelectors = React.useMemo(() => {
    if (!rmId) {
      return undefined;
    }
    return {
      [KnownLabels.REGISTERED_MODEL_ID]: rmId,
    };
  }, [rmId]);

  return (
    <ModelDeploymentsProvider projects={projects} labelSelectors={labelSelectors} mrName={mrName}>
      <Card>
        <CardTitle>Latest deployments</CardTitle>
        <DeploymentCard rmId={rmId} preferredModelRegistry={mrName} />
      </Card>
    </ModelDeploymentsProvider>
  );
};

export default ModelDetailsDeploymentCard;
