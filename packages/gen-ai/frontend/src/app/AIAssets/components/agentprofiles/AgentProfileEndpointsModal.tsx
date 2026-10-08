import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { AgentDeploymentSummary } from '~/app/agentProfile/types';
import { responseAPIURL, sortDeploymentsByMostRecent } from '~/app/agentProfile/deploymentUtils';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';
import { genAiAgentProfileDetailRoute } from '~/app/utilities/routes';

type AgentProfileEndpointsModalProps = {
  agentName: string;
  namespace: string;
  profileId: string;
  deployments: AgentDeploymentSummary[];
  onClose: () => void;
};

const formatDeploymentDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const deploymentStateLabel = (state: AgentDeploymentSummary['state']): React.ReactNode => {
  switch (state) {
    case 'ready':
      return <Label status="success">Active</Label>;
    case 'failed':
      return (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
    default:
      return (
        <Label color="grey" icon={<InProgressIcon />}>
          Creating
        </Label>
      );
  }
};

const AgentProfileEndpointsModal: React.FC<AgentProfileEndpointsModalProps> = ({
  agentName,
  namespace,
  profileId,
  deployments,
  onClose,
}) => {
  const sortedDeployments = React.useMemo(
    () => sortDeploymentsByMostRecent(deployments),
    [deployments],
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="large"
      aria-labelledby="agent-profile-endpoints-modal-title"
      data-testid="agent-profile-endpoints-modal"
    >
      <ModalHeader
        title={`${agentName} – Endpoint(s)`}
        labelId="agent-profile-endpoints-modal-title"
      />
      <ModalBody>
        <Table aria-label={`${agentName} endpoints`} variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Deployed</Th>
              <Th>Endpoint</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {sortedDeployments.map((deployment, index) => {
              const endpoint = responseAPIURL(deployment.routeUrl);
              const detailsPath = `${genAiAgentProfileDetailRoute(
                namespace,
                profileId,
              )}?deployment=${encodeURIComponent(deployment.name)}`;

              return (
                <Tr key={deployment.name} data-testid={`agent-endpoint-${deployment.name}`}>
                  <Td dataLabel="Name">
                    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                      <FlexItem>{deployment.displayName || deployment.name}</FlexItem>
                      {index === 0 && (
                        <FlexItem>
                          <Label color="blue">Latest</Label>
                        </FlexItem>
                      )}
                    </Flex>
                  </Td>
                  <Td dataLabel="Status">{deploymentStateLabel(deployment.state)}</Td>
                  <Td dataLabel="Deployed">{formatDeploymentDate(deployment.createdAt)}</Td>
                  <Td dataLabel="Endpoint">
                    {endpoint ? (
                      <ClipboardCopy
                        isReadOnly
                        hoverTip="Copy endpoint"
                        clickTip="Copied"
                        aria-label={`Endpoint for ${deployment.displayName || deployment.name}`}
                        isCode
                        isExpanded={false}
                      >
                        {endpoint}
                      </ClipboardCopy>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td dataLabel="View full details">
                    <Button
                      variant="link"
                      component={(props) => <Link {...props} to={detailsPath} />}
                      onClick={() =>
                        fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_DETAILS_VIEWED, {})
                      }
                      data-testid={`view-deployment-details-${deployment.name}`}
                    >
                      View details
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </ModalBody>
    </Modal>
  );
};

export default AgentProfileEndpointsModal;
