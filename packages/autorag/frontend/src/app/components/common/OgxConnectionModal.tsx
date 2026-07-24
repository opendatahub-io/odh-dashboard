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
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { createSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';

type Props = {
  namespace: string;
  onClose: () => void;
  onSubmit: (secretName: string) => void | Promise<void>;
};

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const OgxConnectionModal: React.FC<Props> = ({ namespace, onClose, onSubmit }) => {
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [baseUrl, setBaseUrl] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [baseUrlTouched, setBaseUrlTouched] = React.useState(false);

  const baseUrlValid = React.useMemo(() => isValidUrl(baseUrl), [baseUrl]);
  const showBaseUrlError = baseUrlTouched && baseUrl.trim() !== '' && !baseUrlValid;
  const showHttpWarning = React.useMemo(() => {
    if (!baseUrlValid || !baseUrlTouched) {
      return false;
    }
    try {
      const parsed = new URL(baseUrl.trim());
      return (
        parsed.protocol === 'http:' &&
        parsed.hostname !== 'localhost' &&
        parsed.hostname !== '127.0.0.1'
      );
    } catch {
      return false;
    }
  }, [baseUrl, baseUrlValid, baseUrlTouched]);
  const isFormValid = isK8sNameDescriptionDataValid(nameDescData) && baseUrlValid;

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
        annotations: {
          'openshift.io/display-name': nameDescData.name.trim(),
        },
      },
      stringData: {
        OGX_CLIENT_BASE_URL: baseUrl.trim(),
        OGX_CLIENT_API_KEY: apiKey.trim(),
      },
    };

    try {
      await createSecret(secret);
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error(String(e)));
      setIsSaving(false);
      return;
    }

    try {
      await onSubmit(k8sName);
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={isSaving ? undefined : onClose} variant="medium">
      <ModalHeader
        title="Add Open GenAI Stack connection"
        description="Provide credentials for accessing an external Open GenAI Stack server. The generation and embedding models registered in the Open GenAI Stack server will be considered when generating RAG patterns. Vector I/O providers in the Open GenAI Stack server can be used to create a collection for retrieval."
      />
      <ModalBody>
        <Form>
          <K8sNameDescriptionField
            dataTestId="ogx-connection"
            data={nameDescData}
            onDataChange={setNameDescData}
            nameLabel="Connection name"
            hideDescription
          />
          <FormGroup fieldId="ogx-connection-base-url" label="Base URL" isRequired>
            <TextInput
              id="ogx-connection-base-url"
              data-testid="ogx-connection-base-url"
              value={baseUrl}
              onChange={(_e, val) => setBaseUrl(val)}
              onBlur={() => {
                setBaseUrlTouched(true);
                setBaseUrl((prev) => prev.trim());
              }}
              maxLength={2048}
              validated={showBaseUrlError ? 'error' : 'default'}
              isRequired
            />
            <FormHelperText>
              <HelperText>
                {showBaseUrlError ? (
                  <HelperTextItem variant="error">
                    Enter a valid URL (e.g. https://example.com).
                  </HelperTextItem>
                ) : showHttpWarning ? (
                  <HelperTextItem variant="warning" data-testid="ogx-connection-http-warning">
                    Using HTTPS is recommended for secure communication with Open GenAI Stack.
                  </HelperTextItem>
                ) : (
                  <HelperTextItem>
                    The base URL of the Open GenAI Stack connection (https:// recommended).
                  </HelperTextItem>
                )}
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup fieldId="ogx-connection-api-key" label="API key">
            <PasswordInput
              id="ogx-connection-api-key"
              data-testid="ogx-connection-api-key"
              value={apiKey}
              onChange={(_e, val) => setApiKey(val)}
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
          alertTitle="Failed to create connection"
        />
      </ModalFooter>
    </Modal>
  );
};

export default OgxConnectionModal;
