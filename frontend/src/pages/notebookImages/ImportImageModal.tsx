import React from 'react';
import { Button, Form, FormGroup, TextInput, Modal, ModalVariant } from '@patternfly/react-core';
import { importNotebook } from '../../services/notebookImageService';
import { State } from '../../redux/types';
import { useSelector } from 'react-redux';
import { Notebook } from 'types';
export type ImportImageModalProps = {
  isOpen: boolean;
  onCloseHandler: () => void;
  onImportHandler(notebook: Notebook);
};
export const ImportImageModal: React.FC<ImportImageModalProps> = ({
  isOpen,
  onImportHandler,
  onCloseHandler,
}) => {
  const [repository, setRepository] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const userName: string = useSelector<State, string>((state) => state.appState.user || '');
  return (
    <Modal
      variant={ModalVariant.medium}
      title="Import Notebook images"
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={() => {
            importNotebook({
              name: name,
              url: repository,
              description: description,
              user: userName,
            }).then((value) => {
              onImportHandler(value);
              onCloseHandler();
            });
          }}
        >
          Import
        </Button>,
        <Button key="cancel" variant="link" onClick={onCloseHandler}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
        <FormGroup
          label="Repository"
          isRequired
          fieldId="notebook-image-repository-label"
          helperText="Repo where notebook images are stored."
        >
          <TextInput
            isRequired
            type="text"
            id="notebook-image-repository-input"
            name="notebook-image-repository-input"
            aria-describedby="notebook-image-repository-input"
            value={repository}
            onChange={(value) => {
              setRepository(value);
            }}
          />
        </FormGroup>
        <FormGroup label="Name" isRequired fieldId="notebook-image-name-label">
          <TextInput
            isRequired
            type="text"
            id="notebook-image-name-input"
            name="notebook-image-name-input"
            value={name}
            onChange={(value) => {
              setName(value);
            }}
          />
        </FormGroup>
        <FormGroup label="Description" fieldId="notebook-image-description">
          <TextInput
            isRequired
            type="text"
            id="notebook-image-description-input"
            name="notebook-image-description-input"
            aria-describedby="notebook-image-description-input"
            value={description}
            onChange={(value) => {
              setDescription(value);
            }}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ImportImageModal;
