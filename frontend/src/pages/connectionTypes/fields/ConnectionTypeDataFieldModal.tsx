import * as React from 'react';
import {
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  Popover,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ConnectionTypeDataField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import { isEnumMember } from '~/utilities/utils';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import ConnectionTypeDataFormField from '~/concepts/connectionTypes/fields/ConnectionTypeDataFormField';

const ENV_VAR_NAME_REGEX = new RegExp('^[-._a-zA-Z][-._a-zA-Z0-9]*$');

const isConnectionTypeFieldType = (
  fieldType: string | number | undefined,
): fieldType is ConnectionTypeFieldType =>
  isEnumMember(fieldType?.toString(), ConnectionTypeFieldType);

interface ConnectionTypeFieldModalProps {
  field?: ConnectionTypeDataField;
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (field: ConnectionTypeDataField) => void;
  isEdit?: boolean;
}

const fieldTypeLabels: { [key: string]: string } = {
  [ConnectionTypeFieldType.Boolean]: 'Boolean',
  [ConnectionTypeFieldType.Dropdown]: 'Dropdown',
  [ConnectionTypeFieldType.File]: 'File',
  [ConnectionTypeFieldType.Hidden]: 'Hidden',
  [ConnectionTypeFieldType.Numeric]: 'Numeric',
  [ConnectionTypeFieldType.ShortText]: 'Short text',
  [ConnectionTypeFieldType.Text]: 'Long text',
  [ConnectionTypeFieldType.URI]: 'URI',
};

const fieldTypeTestIds: { [key: string]: string } = {
  [ConnectionTypeFieldType.Boolean]: 'field-boolean-select',
  [ConnectionTypeFieldType.Dropdown]: 'field-dropdown-select',
  [ConnectionTypeFieldType.File]: 'field-file-select',
  [ConnectionTypeFieldType.Hidden]: 'field-hidden-select',
  [ConnectionTypeFieldType.Numeric]: 'field-numeric-select',
  [ConnectionTypeFieldType.ShortText]: 'field-short-text-select',
  [ConnectionTypeFieldType.Text]: 'field-long-text-select',
  [ConnectionTypeFieldType.URI]: 'field-uri-select',
};

const supportedFieldTypes = [
  ConnectionTypeFieldType.ShortText,
  ConnectionTypeFieldType.Text,
  ConnectionTypeFieldType.Numeric,
  ConnectionTypeFieldType.URI,
  ConnectionTypeFieldType.Hidden,
  ConnectionTypeFieldType.File,
];

export const ConnectionTypeDataFieldModal: React.FC<ConnectionTypeFieldModalProps> = ({
  field,
  isOpen,
  onClose,
  onSubmit,
  isEdit,
}) => {
  const [isTypeSelectOpen, setIsTypeSelectOpen] = React.useState<boolean>(false);
  const [formField, setFormField] = React.useState<ConnectionTypeDataField>(
    field
      ? { ...field }
      : {
          type: ConnectionTypeFieldType.ShortText,
          name: '',
          envVar: '',
          properties: {},
        },
  );

  const envVarValidation =
    !formField.envVar || ENV_VAR_NAME_REGEX.test(formField.envVar)
      ? ValidatedOptions.default
      : ValidatedOptions.error;

  const valid = React.useMemo(
    () => !!formField.name && !!formField.envVar && envVarValidation === ValidatedOptions.default,
    [formField.name, formField.envVar, envVarValidation],
  );

  const handleSubmit = () => {
    onSubmit(formField);
    onClose();
  };

  return (
    <Modal
      isOpen
      variant="medium"
      title={isEdit ? 'Edit field' : 'Add field'}
      onClose={onClose}
      footer={
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Edit' : 'Add'}
          isSubmitDisabled={!valid}
          alertTitle="Error"
        />
      }
      data-testid="archive-model-version-modal"
    >
      <Form>
        <FormGroup fieldId="name" label="Field name" isRequired>
          <TextInput
            id="name"
            value={formField.name}
            onChange={(_ev, value) => setFormField((prev) => ({ ...prev, name: value }))}
            data-testid="field-name-input"
          />
        </FormGroup>
        <FormGroup
          fieldId="description"
          label="Field description"
          labelIcon={
            <Popover
              aria-label="field description help"
              headerContent="Field description"
              bodyContent="Use the field description to provide users in your organization with additional information about a field, or instructions for completing the field. Your input will appear in a popover, like this one."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info for section heading"
              />
            </Popover>
          }
        >
          <TextArea
            id="description"
            data-testid="field-description-input"
            value={formField.description || ''}
            onChange={(_ev, value) => setFormField((prev) => ({ ...prev, description: value }))}
          />
        </FormGroup>
        <FormGroup
          fieldId="envVar"
          label="Environment variable"
          labelIcon={
            <Popover
              aria-label="environment variable help"
              headerContent="Environment variable"
              bodyContent="Environment variables grant you access to the value provided when attaching the connection to your workbench."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info for section heading"
              />
            </Popover>
          }
          isRequired
        >
          <TextInput
            id="envVar"
            value={formField.envVar}
            onChange={(_ev, value) => setFormField((prev) => ({ ...prev, envVar: value }))}
            data-testid="field-env-var-input"
            validated={envVarValidation}
          />
          {envVarValidation === ValidatedOptions.error ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                  {`Invalid variable name. The name must consist of alphabetic characters, digits, '_', '-', or '.', and must not start with a digit.`}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
        <FormGroup
          fieldId="fieldType"
          label="Field type"
          isRequired
          data-testid="field-type-select"
        >
          <Select
            id="fieldType"
            isOpen={isTypeSelectOpen}
            shouldFocusToggleOnSelect
            selected={formField.type}
            onSelect={(_e, selection) => {
              if (isConnectionTypeFieldType(selection)) {
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                setFormField((prev) => ({ ...prev, type: selection } as ConnectionTypeDataField));
                setIsTypeSelectOpen(false);
              }
            }}
            onOpenChange={(open) => setIsTypeSelectOpen(open)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                id="type-select"
                isFullWidth
                onClick={() => {
                  setIsTypeSelectOpen((open) => !open);
                }}
                isExpanded={isOpen}
              >
                {fieldTypeLabels[formField.type]}
              </MenuToggle>
            )}
          >
            <SelectList>
              {supportedFieldTypes.map((fieldType) => (
                <SelectOption
                  key={fieldType}
                  value={fieldType}
                  data-testid={fieldTypeTestIds[fieldType]}
                >
                  {fieldTypeLabels[fieldType]}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </FormGroup>
        <ConnectionTypeDataFormField
          field={{ ...formField, name: 'Default value' }}
          value={formField.properties.defaultValue}
          onChange={(f, value) => {
            setFormField((prev) => ({
              ...prev,
              // even though the value is the type of the field default value, typescript cannot determine this here
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
              properties: { ...prev.properties, defaultValue: value as any },
            }));
          }}
          isPreview={false}
        />
        <FormGroup fieldId="isRequired">
          <Checkbox
            id="isRequired"
            data-testid="field-required-checkbox"
            label="Field is required"
            isChecked={formField.required || false}
            onChange={(_ev, checked) => {
              setFormField((prev) => ({ ...prev, required: checked }));
            }}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};
