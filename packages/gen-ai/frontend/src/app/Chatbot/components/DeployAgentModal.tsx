import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@patternfly/react-core';
import AgentConfigurationCard from '~/app/AIAssets/components/agentprofiles/AgentConfigurationCard';
import type { AgentProfile } from '~/app/agentProfile/types';
import './DeployAgentModal.scss';

type DeployAgentModalProps = {
  profile: Pick<AgentProfile, 'spec'>;
  namespace: string;
  isDeploying: boolean;
  missingMCPServerAuth: string[];
  existingDeploymentNames: string[];
  onDeploy: (name: string) => void;
  onClose: () => void;
};

const getMaxDeploymentNameLength = (namespace: string): number =>
  Math.min(54, 57 - namespace.length);

const toDNS1035Name = (value: string, maxLength: number): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const withLeadingLetter = /^[a-z]/.test(normalized) ? normalized : `agent-${normalized}`;
  return withLeadingLetter.slice(0, maxLength).replace(/-+$/g, '') || 'agent';
};

const getNextDeploymentName = (
  displayName: string,
  maxLength: number,
  existingDeploymentNames: string[],
): string => {
  const existingNames = new Set(existingDeploymentNames);

  for (let suffix = 1; ; suffix += 1) {
    const suffixValue = `-${suffix}`;
    const baseName = toDNS1035Name(displayName, maxLength - suffixValue.length);
    const candidate = `${baseName}${suffixValue}`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
  }
};

const DeployAgentModal: React.FC<DeployAgentModalProps> = ({
  profile,
  namespace,
  isDeploying,
  missingMCPServerAuth,
  existingDeploymentNames,
  onDeploy,
  onClose,
}) => {
  const maxNameLength = getMaxDeploymentNameLength(namespace);
  const defaultName = React.useMemo(
    () => getNextDeploymentName(profile.spec.displayName, maxNameLength, existingDeploymentNames),
    [profile.spec.displayName, maxNameLength, existingDeploymentNames],
  );
  const [name, setName] = React.useState(defaultName);
  const [nameTouched, setNameTouched] = React.useState(false);

  const nameIsValid = /^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(name) && name.length <= maxNameLength;
  // The deployment list refreshes as soon as creation starts. Ignore the newly-created
  // deployment while this modal is polling it so its own name is not shown as a duplicate.
  const nameIsUnique = isDeploying || !existingDeploymentNames.includes(name);
  const hasNameError = nameTouched && (!nameIsValid || !nameIsUnique);
  const nameHelperText =
    nameTouched && !nameIsValid
      ? `Use lowercase letters, numbers, and hyphens. The name must start with a letter and be at most ${maxNameLength} characters.`
      : nameTouched && !nameIsUnique
        ? 'An agent deployment with this name already exists. Choose a different name.'
        : 'The deployment endpoint will be available when creation completes.';

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="large"
      aria-labelledby="deploy-agent-modal-title"
      data-testid="deploy-agent-modal"
    >
      <ModalHeader title="Deploy agent" labelId="deploy-agent-modal-title" />
      <ModalBody>
        <Form className="gen-ai-deploy-agent-modal__form">
          <FormGroup label="Name" isRequired fieldId="deploy-agent-name">
            <TextInput
              id="deploy-agent-name"
              value={name}
              onChange={(_event, value) => setName(value)}
              onBlur={() => setNameTouched(true)}
              validated={hasNameError ? 'error' : 'default'}
              isRequired
              data-testid="deploy-agent-name-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={hasNameError ? 'error' : 'default'}>
                  {nameHelperText}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <p>This creates an immutable snapshot of the current agent as a deployed endpoint.</p>
          {missingMCPServerAuth.length > 0 && (
            <Alert
              isInline
              variant="warning"
              title="MCP server authentication is required"
              data-testid="deploy-agent-mcp-auth-warning"
            >
              Connect {missingMCPServerAuth.join(', ')} in the MCP servers tab before deploying so
              the deployment can use its selected tools.
            </Alert>
          )}
          <AgentConfigurationCard
            profile={profile}
            title="Configuration snapshot"
            isSavedConfiguration
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => onDeploy(name)}
          isLoading={isDeploying}
          isDisabled={
            isDeploying || !nameIsValid || !nameIsUnique || missingMCPServerAuth.length > 0
          }
          data-testid="deploy-agent-submit-button"
        >
          Deploy
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isDeploying}
          data-testid="deploy-agent-cancel-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeployAgentModal;
