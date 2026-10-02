import * as React from 'react';
import {
  Button,
  ExpandableSection,
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

type DeployAgentModalProps = {
  profile: Pick<AgentProfile, 'spec'>;
  namespace: string;
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

const getAppsDomain = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const hostParts = window.location.hostname.split('.');
  return hostParts.length > 1 ? hostParts.slice(1).join('.') : undefined;
};

const DeployAgentModal: React.FC<DeployAgentModalProps> = ({ profile, namespace, onClose }) => {
  const maxNameLength = getMaxDeploymentNameLength(namespace);
  const defaultName = React.useMemo(
    () => toDNS1035Name(profile.spec.displayName, maxNameLength),
    [profile, maxNameLength],
  );
  const [name, setName] = React.useState(defaultName);
  const [servingName, setServingName] = React.useState(defaultName);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [servingNameTouched, setServingNameTouched] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const nameIsValid = /^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(name) && name.length <= maxNameLength;
  const servingNameIsValid =
    /^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(servingName) && servingName.length <= maxNameLength;
  const appsDomain = getAppsDomain();
  const routePreview = appsDomain
    ? `https://${servingName}-${namespace}.${appsDomain}`
    : `https://${servingName}-${namespace}.apps.<cluster-domain>`;

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
        <Form>
          <FormGroup label="Name" isRequired fieldId="deploy-agent-name">
            <TextInput
              id="deploy-agent-name"
              value={name}
              onChange={(_event, value) => setName(value)}
              onBlur={() => setNameTouched(true)}
              validated={nameTouched && !nameIsValid ? 'error' : 'default'}
              isRequired
              data-testid="deploy-agent-name-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={nameTouched && !nameIsValid ? 'error' : 'default'}>
                  Use lowercase letters, numbers, and hyphens. The name must start with a letter and
                  be at most {maxNameLength} characters.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <ExpandableSection
            toggleText={
              showAdvanced ? 'Hide advanced options' : 'Advanced: use a different serving name'
            }
            isExpanded={showAdvanced}
            onToggle={(_event, isExpanded) => setShowAdvanced(isExpanded)}
            className="pf-v6-u-mb-lg"
            data-testid="deploy-agent-advanced-options"
          >
            <FormGroup label="Serving name" isRequired fieldId="deploy-agent-serving-name">
              <TextInput
                id="deploy-agent-serving-name"
                value={servingName}
                onChange={(_event, value) => {
                  setServingName(value);
                  setServingNameTouched(true);
                }}
                onBlur={() => setServingNameTouched(true)}
                validated={servingNameTouched && !servingNameIsValid ? 'error' : 'default'}
                isRequired
                data-testid="deploy-agent-serving-name-input"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    variant={servingNameTouched && !servingNameIsValid ? 'error' : 'default'}
                  >
                    {servingNameTouched && !servingNameIsValid
                      ? `Use lowercase letters, numbers, and hyphens. The serving name must start with a letter and be at most ${maxNameLength} characters.`
                      : `Public route: ${routePreview}`}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </ExpandableSection>

          <p className="pf-v6-u-mb-lg">
            This creates an immutable snapshot of the current agent as a deployed endpoint.
          </p>
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
          isDisabled={!nameIsValid || !servingNameIsValid}
          data-testid="deploy-agent-submit-button"
        >
          Deploy
        </Button>
        <Button variant="link" onClick={onClose} data-testid="deploy-agent-cancel-button">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeployAgentModal;
