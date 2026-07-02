import * as React from 'react';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  protocolOptions,
  workloadTypeOptions,
} from '~/app/deployWizard/wizardOptions';
import { isValidK8sStorageQuantity } from '~/app/deployWizard/utils';

const ConfigurationStep: React.FC = () => {
  const { formData, setFormField } = useAgentDeployWizardContext();

  const pvcSizeInvalid =
    formData.enablePersistentStorage && !isValidK8sStorageQuantity(formData.persistentVolumeSize);

  return (
    <Form>
      <FormSection title="Configuration">
        <FormGroup label="Protocol" isRequired fieldId="deploy-agent-protocol">
          <DeployWizardSelectField>
            <SimpleSelect
              dataTestId="deploy-agent-protocol-select"
              placeholder="Select a protocol"
              value={formData.protocol}
              options={protocolOptions}
              onChange={(key) => setFormField('protocol', key)}
              isFullWidth
              maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
              popperProps={{ appendTo: 'inline' }}
              toggleProps={{ id: 'deploy-agent-protocol', 'aria-label': 'Protocol' }}
            />
          </DeployWizardSelectField>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Sets protocol.kagenti.io/&lt;protocol&gt; label. Example: A2A (Agent-to-Agent).
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label="Workload type" isRequired fieldId="deploy-agent-workload-type">
          <DeployWizardSelectField>
            <SimpleSelect
              dataTestId="deploy-agent-workload-type-select"
              placeholder="Select a workload type"
              value={formData.workloadType}
              options={workloadTypeOptions}
              onChange={(key) => setFormField('workloadType', key)}
              isFullWidth
              maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
              popperProps={{ appendTo: 'inline' }}
              toggleProps={{ id: 'deploy-agent-workload-type', 'aria-label': 'Workload type' }}
            />
          </DeployWizardSelectField>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Kubernetes-native sandbox with stable identity, persistent storage, and lifecycle
                management (pause/resume/expire)
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup fieldId="deploy-agent-enable-persistent-storage">
          <Checkbox
            id="deploy-agent-enable-persistent-storage"
            data-testid="deploy-agent-enable-persistent-storage"
            label="Enable persistent storage"
            isChecked={formData.enablePersistentStorage}
            onChange={(_event, checked) => setFormField('enablePersistentStorage', checked)}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>PVC for /shared mount; emptyDir when unchecked</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        {formData.enablePersistentStorage && (
          <FormGroup
            label="Persistent volume size"
            isRequired
            fieldId="deploy-agent-persistent-volume-size"
          >
            <TextInput
              id="deploy-agent-persistent-volume-size"
              data-testid="deploy-agent-persistent-volume-size"
              value={formData.persistentVolumeSize}
              validated={pvcSizeInvalid ? ValidatedOptions.error : ValidatedOptions.default}
              aria-invalid={pvcSizeInvalid}
              aria-describedby={
                pvcSizeInvalid
                  ? 'deploy-agent-persistent-volume-size-error'
                  : 'deploy-agent-persistent-volume-size-helper'
              }
              onChange={(_event, value) => setFormField('persistentVolumeSize', value)}
              placeholder="1Gi"
            />
            <FormHelperText id="deploy-agent-persistent-volume-size-helper">
              <HelperText>
                <HelperTextItem>e.g., 1Gi</HelperTextItem>
              </HelperText>
            </FormHelperText>
            {pvcSizeInvalid && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem id="deploy-agent-persistent-volume-size-error" variant="error">
                    Enter a valid storage size (e.g., 1Gi).
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        )}
      </FormSection>
    </Form>
  );
};

export default ConfigurationStep;
