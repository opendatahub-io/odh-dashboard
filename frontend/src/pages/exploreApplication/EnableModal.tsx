import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormAlert,
  FormGroup,
  Modal,
  ModalVariant,
  TextInput,
  TextInputTypes,
} from '@patternfly/react-core';
import { ODHApp } from '../../types';
import { postValidateIsv } from '../../services/validateIsvService';

type EnableModalProps = {
  selectedApp?: ODHApp;
  onClose: () => void;
};

const EnableModal: React.FC<EnableModalProps> = ({ selectedApp, onClose }) => {
  const [postError, setPostError] = React.useState<boolean>(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});

  if (!selectedApp) {
    return null;
  }

  const updateEnableValue = (key: string, value: string): void => {
    const updatedValues = {
      ...enableValues,
      [key]: value,
    };
    setEnableValues(updatedValues);
  };

  const renderAppVariables = () => {
    if (!selectedApp.spec.enable?.variables) {
      return null;
    }
    return Object.keys(selectedApp.spec.enable.variables).map((key) => (
      <FormGroup
        fieldId={key}
        key={key}
        label={selectedApp.spec.enable?.variableDisplayText?.[key] ?? key}
        helperText={selectedApp.spec.enable?.variableHelpText?.[key]}
      >
        <TextInput
          id={key}
          type={(selectedApp.spec.enable?.variables?.[key] || 'text') as TextInputTypes}
          onChange={(value) => updateEnableValue(key, value)}
        />
      </FormGroup>
    ));
  };

  const onDoEnableApp = () => {
    postValidateIsv(selectedApp.metadata.name, enableValues)
      .then(() => {
        setPostError(false);
        onClose();
      })
      .catch(() => {
        setPostError(true);
      });
  };

  return (
    <Modal
      variant={ModalVariant.small}
      title={selectedApp.spec.enable?.title}
      isOpen
      onClose={onClose}
      actions={[
        <Button key="confirm" variant="primary" onClick={onDoEnableApp}>
          {selectedApp.spec.enable?.actionLabel}
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
      {selectedApp.spec.enable?.description ? selectedApp.spec.enable?.description : null}
      {selectedApp.spec.enable?.variables ? (
        <Form>
          {postError ? (
            <FormAlert>
              <Alert
                variant="danger"
                title="Error attempting to validate entries. Please check your entries."
                aria-live="polite"
                isInline
              />
            </FormAlert>
          ) : null}
          {renderAppVariables()}
        </Form>
      ) : null}
    </Modal>
  );
};

export default EnableModal;
