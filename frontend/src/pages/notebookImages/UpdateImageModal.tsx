import React from 'react';
import { Button, Form, FormGroup, TextInput, Modal, ModalVariant } from '@patternfly/react-core';
import { Caption, TableComposable, Tbody, Thead, Th, Tr, Td } from '@patternfly/react-table';
import { updateNotebook } from '../../services/notebookImageService';
import { Notebook, NotebookPackage } from 'types';
export type UpdateImageModalProps = {
  isOpen: boolean;
  notebook: Notebook;
  onCloseHandler: () => void;
  onUpdateHandler(notebook: Notebook);
};
export const UpdateImageModal: React.FC<UpdateImageModalProps> = ({
  isOpen,
  notebook,
  onUpdateHandler,
  onCloseHandler,
}) => {
  const [name, setName] = React.useState<string>(notebook.name);
  const [description, setDescription] = React.useState<string>(
    notebook.description != undefined ? notebook.description : '',
  );
  const [packages, setPackages] = React.useState<NotebookPackage[]>(
    notebook.packages != undefined ? notebook.packages : [],
  );

  React.useEffect(() => {
    if (isOpen === true) {
      setName(notebook.name);
      setDescription(notebook.description != undefined ? notebook.description : '');
      setPackages(notebook.packages != undefined ? notebook.packages : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      variant={ModalVariant.medium}
      title={`Edit Package Documentation for ${notebook.name}`}
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={() => {
            updateNotebook({
              id: notebook.id,
              name: name,
              description: description,
              packages: packages,
            }).then((value) => {
              onUpdateHandler(value);
              onCloseHandler();
            });
          }}
        >
          Save Changes
        </Button>,
        <Button key="cancel" variant="link" onClick={onCloseHandler}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
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
        <FormGroup label="Advertised packages" fieldId="notebook-packages">
          <TableComposable aria-label="Simple table" variant="compact">
            <Caption>
              Change the advertised packages shown with this notebook image. Modifying that packages
              here does not effect the contents of the notebook image.
            </Caption>
            <Thead>
              <Tr>
                <Th>Package</Th>
                <Th>Version</Th>
              </Tr>
            </Thead>
            <Tbody>
              {packages.map((value) => (
                <Tr isEditable key={value.name}>
                  <Td dataLabel={value.name}>{value.name}</Td>
                  <Td dataLabel={value.version}>{value.version}</Td>
                </Tr>
              ))}
            </Tbody>
          </TableComposable>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default UpdateImageModal;
