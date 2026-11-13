import * as React from 'react';
import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  McpConditionStatus,
  McpDeployment,
  McpDeploymentCondition,
} from '~/odh/types/mcpDeploymentTypes';
import { getDeploymentDisplayName, getStatusInfo, isGatewayRegistrationPending } from './utils';

type McpDeploymentInstallStatusModalProps = {
  deployment: McpDeployment;
  onClose: () => void;
};

const conditionState = (condition: McpDeploymentCondition | undefined) => {
  if (condition?.status === McpConditionStatus.TRUE) {
    return 'ready' as const;
  }
  if (
    condition?.status === McpConditionStatus.FALSE &&
    !(condition.type === 'GatewayRegistration'
      ? isGatewayRegistrationPending(condition)
      : condition.reason === 'Pending')
  ) {
    return 'blocked' as const;
  }
  return 'pending' as const;
};

const InstallStatusRow: React.FC<{
  label: string;
  condition?: McpDeploymentCondition;
  detail: string;
  optional?: boolean;
}> = ({ label, condition, detail, optional }) => {
  const state = conditionState(condition);
  const icon =
    state === 'ready' ? (
      <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
    ) : state === 'blocked' ? (
      <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />
    ) : (
      <Spinner size="sm" aria-label={`${label} in progress`} />
    );

  return (
    <ListItem>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsFlexStart' }}>
        <FlexItem>{icon}</FlexItem>
        <FlexItem>
          <Content component="p">
            <b>{label}</b>{' '}
            {optional && (
              <Label isCompact color="grey">
                Optional
              </Label>
            )}
          </Content>
          <Content component="small">{condition?.message || detail}</Content>
        </FlexItem>
      </Flex>
    </ListItem>
  );
};

const McpDeploymentInstallStatusModal: React.FC<McpDeploymentInstallStatusModalProps> = ({
  deployment,
  onClose,
}) => {
  const status = getStatusInfo(deployment.conditions);
  const accepted = deployment.conditions.find((condition) => condition.type === 'Accepted');
  const ready = deployment.conditions.find((condition) => condition.type === 'Ready');
  const gateway = deployment.conditions.find(
    (condition) => condition.type === 'GatewayRegistration',
  );
  const gatewayRequired = !!gateway;
  const complete =
    ready?.status === McpConditionStatus.TRUE &&
    (!gateway || gateway.status === McpConditionStatus.TRUE);
  const failed = status.status === 'danger';

  return (
    <Modal isOpen variant="medium" onClose={onClose} data-testid="mcp-install-status-modal">
      <ModalHeader
        title={`Installation status: ${getDeploymentDisplayName(deployment)}`}
        description="This status is read from the live MCPServer and Gateway registration resources. It is the durable status view for this installation."
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h3" size="lg">
              {complete
                ? 'Installation complete'
                : failed
                  ? 'Installation needs attention'
                  : 'Installing...'}
            </Title>
            <Content component="p">
              <Label color={complete ? 'green' : failed ? 'red' : 'blue'}>{status.label}</Label>
            </Content>
          </StackItem>
          {failed && (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title="The cluster reported a blocked installation step"
              >
                {status.popoverBody}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <List>
              <InstallStatusRow
                label="Configuration accepted"
                condition={accepted}
                detail="The MCPServer configuration has been accepted by the cluster."
              />
              <InstallStatusRow
                label="MCP server"
                condition={ready}
                detail="The MCP server deployment is becoming ready."
              />
              {gatewayRequired && (
                <InstallStatusRow
                  label="Gateway registration"
                  condition={gateway}
                  detail="The MCP server is being registered with the configured Gateway."
                />
              )}
            </List>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default McpDeploymentInstallStatusModal;
