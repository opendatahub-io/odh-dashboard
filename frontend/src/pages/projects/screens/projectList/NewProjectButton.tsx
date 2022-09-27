import * as React from 'react';
import { Button, Form, FormGroup, Modal, TextArea, TextInput } from '@patternfly/react-core';
import { createProject } from '../../../../api';
import { useUser } from '../../../../redux/selectors';
import { useNavigate } from 'react-router-dom';

const NewProjectButton: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const { username } = useUser();

  const canSubmit = !fetching && name.length > 0;

  React.useEffect(() => {
    if (open) {
      nameRef.current?.focus();
    }
  }, [open]);

  const onClose = () => {
    setOpen(false);
    setFetching(false);
    setName('');
    setDescription('');
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Create data science project
      </Button>
      <Modal
        title="Create data science project"
        variant="medium"
        isOpen={open}
        onClose={onClose}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            isDisabled={!canSubmit}
            onClick={() => {
              setFetching(true);
              createProject(username, name, description).then((project) => {
                navigate(`/projects/${project.metadata.name}`);
              });
            }}
          >
            Create
          </Button>,
          <Button key="cancel" variant="link" onClick={onClose}>
            Cancel
          </Button>,
        ]}
      >
        <Form>
          <FormGroup label="Name" isRequired fieldId="project-name">
            <TextInput
              ref={nameRef}
              isRequired
              type="text"
              value={name}
              onChange={(value) => setName(value)}
              placeholder="Project name"
              aria-label="Project name"
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="project-description">
            <TextArea
              placeholder="Project description"
              value={description}
              onChange={(value) => setDescription(value)}
              aria-label="Project description"
            />
          </FormGroup>
        </Form>
      </Modal>
    </>
  );
};

export default NewProjectButton;
