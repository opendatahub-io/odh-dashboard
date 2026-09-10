import React from 'react';
import {
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
import PasswordInput from '@odh-dashboard/internal/components/PasswordInput';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { createSecret } from '@odh-dashboard/k8s-core/api/secrets';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';

type Props = {
  namespace: string;
  onClose: () => void;
  onSubmit: (secretName: string) => void | Promise<void>;
};

const isGatewayOrigin = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      !!url.hostname &&
      !url.username &&
      !url.password &&
      (url.pathname === '' || url.pathname === '/') &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

const MaaSConnectionModal: React.FC<Props> = ({ namespace, onClose, onSubmit }) => {
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [baseUrl, setBaseUrl] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [baseUrlTouched, setBaseUrlTouched] = React.useState(false);
  const baseUrlValid = isGatewayOrigin(baseUrl);
  const showBaseUrlError = baseUrlTouched && !baseUrlValid;
  const isFormValid =
    isK8sNameDescriptionDataValid(nameDescData) && baseUrlValid && apiKey.trim() !== '';

  const handleSubmit = async () => {
    setIsSaving(true);
    setSubmitError(undefined);
    const k8sName = nameDescData.k8sName.value;
    const secret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: k8sName,
        namespace,
        annotations: { 'openshift.io/display-name': nameDescData.name.trim() },
      },
      stringData: { MAAS_BASE_URL: baseUrl.trim(), MAAS_API_KEY: apiKey.trim() },
    };
    try {
      await createSecret(secret);
      await onSubmit(k8sName);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={isSaving ? undefined : onClose} variant="medium">
      <ModalHeader
        title="Add MaaS connection"
        description="Provide the hosted MaaS Gateway origin and API key used to list models."
      />
      <ModalBody>
        <Form>
          <K8sNameDescriptionField
            dataTestId="maas-connection"
            data={nameDescData}
            onDataChange={setNameDescData}
            nameLabel="Connection name"
            hideDescription
          />
          <FormGroup fieldId="maas-connection-base-url" label="Gateway origin" isRequired>
            <TextInput
              id="maas-connection-base-url"
              data-testid="maas-connection-base-url"
              value={baseUrl}
              onChange={(_event, value) => setBaseUrl(value)}
              onBlur={() => {
                setBaseUrlTouched(true);
                setBaseUrl((value) => value.trim());
              }}
              validated={showBaseUrlError ? 'error' : 'default'}
              isRequired
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={showBaseUrlError ? 'error' : 'default'}>
                  {showBaseUrlError
                    ? 'Use an HTTPS origin such as https://maas.apps.example.com, without /maas-api.'
                    : 'Use the hosted MaaS HTTPS origin, without a path.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup fieldId="maas-connection-api-key" label="API key" isRequired>
            <PasswordInput
              id="maas-connection-api-key"
              data-testid="maas-connection-api-key"
              value={apiKey}
              onChange={(_event, value) => setApiKey(value)}
              ariaLabelShow="Show API key"
              ariaLabelHide="Hide API key"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Add connection"
          onCancel={onClose}
          onSubmit={handleSubmit}
          error={submitError}
          isSubmitDisabled={!isFormValid || isSaving}
          isCancelDisabled={isSaving}
          isSubmitLoading={isSaving}
          alertTitle="Failed to create MaaS connection"
        />
      </ModalFooter>
    </Modal>
  );
};

export default MaaSConnectionModal;
