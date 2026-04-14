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
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import { createSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
import { SecretKind } from '@odh-dashboard/internal/k8sTypes';

type Props = {
  namespace: string;
  onClose: () => void;
  onSubmit: (secretName: string) => void;
};

const LlamaStackConnectionModal: React.FC<Props> = ({ namespace, onClose, onSubmit }) => {
  const [name, setName] = React.useState('');
  const [baseUrl, setBaseUrl] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);

  const isFormValid = name.trim() !== '' && baseUrl.trim() !== '';

  const handleSubmit = () => {
    setIsSaving(true);
    setSubmitError(undefined);

    const k8sName = translateDisplayNameForK8s(name);

    const secret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: k8sName,
        namespace,
        annotations: {
          'openshift.io/display-name': name.trim(),
        },
      },
      stringData: {
        LLAMA_STACK_CLIENT_BASE_URL: baseUrl.trim(),
        LLAMA_STACK_CLIENT_API_KEY: apiKey.trim(),
      },
    };

    createSecret(secret)
      .then(() => {
        onSubmit(k8sName);
        onClose();
      })
      .catch((e) => {
        setSubmitError(e);
        setIsSaving(false);
      });
  };

  const handleFieldChange = () => {
    if (!isModified) {
      setIsModified(true);
    }
  };

  return (
    <Modal isOpen onClose={onClose} variant="medium">
      <ModalHeader
        title="Add Llama Stack connection"
        description="Provide credentials for accessing an external Llama Stack server. The generation and embedding models registered in the Llama Stack server will be considered when generating RAG patterns. Vector I/O providers in the Llama Stack server can be used to store a collection for the retrieval."
      />
      <ModalBody>
        <Form>
          <FormGroup fieldId="lls-connection-name" label="Name" isRequired>
            <TextInput
              id="lls-connection-name"
              data-testid="lls-connection-name"
              value={name}
              onChange={(_e, val) => {
                setName(val);
                handleFieldChange();
              }}
              isRequired
            />
          </FormGroup>
          <FormGroup fieldId="lls-connection-base-url" label="Base URL" isRequired>
            <TextInput
              id="lls-connection-base-url"
              data-testid="lls-connection-base-url"
              value={baseUrl}
              onChange={(_e, val) => {
                setBaseUrl(val);
                handleFieldChange();
              }}
              isRequired
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>The base URL of the Llama Stack instance.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup fieldId="lls-connection-api-key" label="API key">
            <TextInput
              id="lls-connection-api-key"
              data-testid="lls-connection-api-key"
              type="password"
              value={apiKey}
              onChange={(_e, val) => {
                setApiKey(val);
                handleFieldChange();
              }}
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
          isSubmitDisabled={!isFormValid || !isModified || isSaving}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      </ModalFooter>
    </Modal>
  );
};

export default LlamaStackConnectionModal;
