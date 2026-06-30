import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import { isValidAgentName, isValidPullSecretName } from '~/app/deployWizard/utils';
import {
  getEffectiveProjectNamespaces,
  useAgentOpsProjectNamespaces,
} from '~/app/hooks/useAgentOpsProjectNamespaces';

const ImageSelectionStep: React.FC = () => {
  const { formData, setFormField, setAgentNameManuallyEdited } = useAgentDeployWizardContext();
  const { projectNamespaces, isLoading, onProjectSelection } = useAgentOpsProjectNamespaces();

  const effectiveNamespaces = React.useMemo(
    () => getEffectiveProjectNamespaces(projectNamespaces, isLoading, formData.project),
    [projectNamespaces, isLoading, formData.project],
  );

  const agentNameInvalid =
    formData.agentName.trim().length > 0 && !isValidAgentName(formData.agentName);

  const pullSecretInvalid =
    formData.pullSecret.trim().length > 0 && !isValidPullSecretName(formData.pullSecret);

  return (
    <Form>
      <FormSection title="Image selection">
        <FormGroup label="Project" isRequired fieldId="deploy-agent-project">
          <DeployWizardSelectField>
            <ProjectSelector
              namespace={formData.project}
              onSelection={(projectName) => {
                setFormField('project', projectName);
                onProjectSelection(projectName);
              }}
              placeholder="Select a project"
              selectorLabel="Project"
              isFullWidth
              isLoading={isLoading}
              namespacesOverride={effectiveNamespaces}
            />
          </DeployWizardSelectField>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>The namespace where the agent will be deployed</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label="Container image" isRequired fieldId="deploy-agent-container-image">
          <TextInput
            id="deploy-agent-container-image"
            data-testid="deploy-agent-container-image"
            value={formData.containerImage}
            onChange={(_event, value) => setFormField('containerImage', value)}
            placeholder="quay.io/myorg/my-agent"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Full image path without tag (e.g., quay.io/myorg/my-agent)
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label="Image tag" isRequired fieldId="deploy-agent-image-tag">
          <TextInput
            id="deploy-agent-image-tag"
            data-testid="deploy-agent-image-tag"
            value={formData.imageTag}
            onChange={(_event, value) => setFormField('imageTag', value)}
            placeholder="latest"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>Tag to apply to the image (e.g., latest, v1.0.0)</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label="Agent name" isRequired fieldId="deploy-agent-name">
          <TextInput
            id="deploy-agent-name"
            data-testid="deploy-agent-name"
            value={formData.agentName}
            validated={agentNameInvalid ? ValidatedOptions.error : ValidatedOptions.default}
            aria-invalid={agentNameInvalid}
            aria-describedby={
              agentNameInvalid ? 'deploy-agent-name-error' : 'deploy-agent-name-helper'
            }
            onChange={(_event, value) => {
              setAgentNameManuallyEdited(true);
              setFormField('agentName', value);
            }}
          />
          <FormHelperText id="deploy-agent-name-helper">
            <HelperText>
              <HelperTextItem>
                Kubernetes resource name. Auto-generated from the image name; you can edit it.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          {agentNameInvalid && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem id="deploy-agent-name-error" variant="error">
                  Agent name must be a valid DNS-1123 label.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
        <FormGroup label="Pull secret" fieldId="deploy-agent-pull-secret">
          <TextInput
            id="deploy-agent-pull-secret"
            data-testid="deploy-agent-pull-secret"
            value={formData.pullSecret}
            validated={pullSecretInvalid ? ValidatedOptions.error : ValidatedOptions.default}
            aria-invalid={pullSecretInvalid}
            aria-describedby={
              pullSecretInvalid
                ? 'deploy-agent-pull-secret-error'
                : 'deploy-agent-pull-secret-helper'
            }
            onChange={(_event, value) => setFormField('pullSecret', value)}
          />
          <FormHelperText id="deploy-agent-pull-secret-helper">
            <HelperText>
              <HelperTextItem>
                Optional secret name for pulling private container images
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          {pullSecretInvalid && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem id="deploy-agent-pull-secret-error" variant="error">
                  Pull secret must be a valid Kubernetes resource name.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default ImageSelectionStep;
