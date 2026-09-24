import * as React from 'react';
import { Button, Form, FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';
import { useHostApi } from '@odh-dashboard/plugin-core';

type NewProjectButtonProps = {
  onProjectCreated?: (projectName: string) => void;
};

const NewProjectButton: React.FC<NewProjectButtonProps> = ({ onProjectCreated }) => {
  const { createProject } = useHostApi();
  const [open, setOpen] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const resetForm = () => {
    setDisplayName('');
    setDescription('');
    setError(undefined);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleCancel = () => {
    if (!submitting) {
      handleClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const projectName = await createProject(trimmedName, description);
      setSubmitting(false);
      handleClose();
      onProjectCreated?.(projectName);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create project'));
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button data-testid="create-project" variant="primary" onClick={() => setOpen(true)}>
        Create project
      </Button>
      {open ? (
        <ContentModal
          title="Create project"
          onClose={handleCancel}
          variant="small"
          error={error}
          alertTitle="Failed to create project"
          contents={
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <FormGroup label="Name" isRequired fieldId="create-project-name">
                <TextInput
                  id="create-project-name"
                  data-testid="create-project-name"
                  value={displayName}
                  onChange={(_event, value) => setDisplayName(value)}
                  isRequired
                  isDisabled={submitting}
                />
              </FormGroup>
              <FormGroup label="Description" fieldId="create-project-description">
                <TextArea
                  id="create-project-description"
                  data-testid="create-project-description"
                  value={description}
                  onChange={(_event, value) => setDescription(value)}
                  isDisabled={submitting}
                />
              </FormGroup>
            </Form>
          }
          buttonActions={[
            {
              label: 'Create',
              variant: 'primary',
              dataTestId: 'create-project-submit',
              onClick: handleSubmit,
              isDisabled: !displayName.trim() || submitting,
              isLoading: submitting,
            },
            {
              label: 'Cancel',
              variant: 'link',
              onClick: handleCancel,
              isDisabled: submitting,
            },
          ]}
        />
      ) : null}
    </>
  );
};

export default NewProjectButton;
