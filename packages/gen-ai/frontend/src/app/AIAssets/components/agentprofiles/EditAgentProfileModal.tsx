import * as React from 'react';
import {
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
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { AgentProfileSummary } from '~/app/agentProfile/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

type EditAgentProfileModalProps = {
  profile: AgentProfileSummary;
  onClose: () => void;
  onSaved: () => void;
};

const EditAgentProfileModal: React.FC<EditAgentProfileModalProps> = ({
  profile,
  onClose,
  onSaved,
}) => {
  const { api, apiAvailable } = useGenAiAPI();
  const [name, setName] = React.useState(profile.displayName);
  const [description, setDescription] = React.useState(profile.description ?? '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingSpec, setIsLoadingSpec] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Full profile is needed for resourceVersion and the rest of spec
  const fullProfileRef = React.useRef<Awaited<ReturnType<typeof api.getAgentProfile>> | null>(null);

  React.useEffect(() => {
    if (!apiAvailable) {
      return undefined;
    }
    const controller = new AbortController();
    api
      .getAgentProfile({ id: profile.profileId }, { signal: controller.signal })
      .then((full) => {
        if (!controller.signal.aborted) {
          fullProfileRef.current = full;
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Failed to load agent profile. Please close and try again.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingSpec(false);
        }
      });
    return () => controller.abort();
  }, [api, apiAvailable, profile.profileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const full = fullProfileRef.current;
    if (!full || !apiAvailable) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await api.updateAgentProfile({
        id: profile.profileId,
        spec: {
          ...full.spec,
          displayName: name.trim(),
          description: description.trim() || undefined,
        },
        resourceVersion: full.metadata.resourceVersion,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsSaving(false);
    }
  };

  const isSaveDisabled = isLoadingSpec || isSaving || !name.trim() || !!error;

  return (
    <Modal
      variant="small"
      isOpen
      onClose={onClose}
      aria-labelledby="edit-agent-profile-modal-title"
      data-testid="edit-agent-profile-modal"
    >
      <ModalHeader title="Edit agent profile" labelId="edit-agent-profile-modal-title" />
      <ModalBody>
        <Form id="edit-agent-profile-form" onSubmit={handleSubmit}>
          <FormGroup label="Name" isRequired fieldId="agent-profile-name">
            <TextInput
              id="agent-profile-name"
              value={name}
              onChange={(_e, val) => setName(val)}
              isRequired
              isDisabled={isSaving}
              data-testid="edit-agent-profile-name"
            />
            {!name.trim() && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">Name is required.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
          <FormGroup label="Description" fieldId="agent-profile-description">
            <TextArea
              id="agent-profile-description"
              value={description}
              onChange={(_e, val) => setDescription(val)}
              resizeOrientation="vertical"
              isDisabled={isSaving}
              rows={4}
              data-testid="edit-agent-profile-description"
            />
          </FormGroup>
          {error && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{error}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          form="edit-agent-profile-form"
          type="submit"
          isLoading={isSaving || isLoadingSpec}
          isDisabled={isSaveDisabled}
          data-testid="edit-agent-profile-save-button"
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSaving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditAgentProfileModal;
