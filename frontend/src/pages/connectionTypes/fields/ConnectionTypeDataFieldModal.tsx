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
import {
  ConnectionTypeCommonProperties,
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
} from '~/concepts/connectionTypes/types';
import { TextForm } from '~/pages/connectionTypes/fields/TextForm';
import { isEnumMember } from '~/utilities/utils';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

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
  [ConnectionTypeFieldType.Dropdown]: 'Short text',
  [ConnectionTypeFieldType.File]: 'File',
  [ConnectionTypeFieldType.Hidden]: 'Hidden',
  [ConnectionTypeFieldType.Numeric]: 'Numeric',
  [ConnectionTypeFieldType.ShortText]: 'Short text',
  [ConnectionTypeFieldType.Text]: 'Text',
  [ConnectionTypeFieldType.URI]: 'URI',
};

const validateForType = (value: string, fieldType: ConnectionTypeFieldType): ValidatedOptions => {
  switch (fieldType) {
    default:
      return ValidatedOptions.default;
  }
};

export const ConnectionTypeDataFieldModal: React.FC<ConnectionTypeFieldModalProps> = ({
  field,
  isOpen,
  onClose,
  onSubmit,
  isEdit,
}) => {
  const [name, setName] = React.useState<string>(field?.name || '');
  const [description, setDescription] = React.useState<string | undefined>(field?.description);
  const [envVar, setEnvVar] = React.useState<string>(field?.envVar || '');
  const [fieldType, setFieldType] = React.useState<ConnectionTypeFieldType>(
    ConnectionTypeFieldType.ShortText,
  );
  const [required, setRequired] = React.useState<boolean | undefined>(field?.required);
  const [isTypeSelectOpen, setIsTypeSelectOpen] = React.useState<boolean>(false);
  const [textProperties, setTextProperties] = React.useState<ConnectionTypeCommonProperties>(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
    (field?.properties as any) || {},
  );

  const envVarValidation =
    !envVar || ENV_VAR_NAME_REGEX.test(envVar) ? ValidatedOptions.default : ValidatedOptions.error;
  const valid = React.useMemo(
    () => !!name && !!envVar && envVarValidation === ValidatedOptions.default,
    [envVar, envVarValidation, name],
  );

  const handleSubmit = () => {
    switch (fieldType) {
      case ConnectionTypeFieldType.Hidden:
      case ConnectionTypeFieldType.File:
      case ConnectionTypeFieldType.ShortText:
      case ConnectionTypeFieldType.Text:
      case ConnectionTypeFieldType.URI:
        onSubmit({
          name,
          description,
          envVar,
          type: fieldType,
          properties: {
            defaultValue: textProperties.defaultValue,
            defaultReadOnly: textProperties.defaultValue
              ? textProperties.defaultReadOnly
              : undefined,
          },
          required,
        });
    }
    onClose();
  };

  const fieldTypeForm = React.useMemo(() => {
    switch (fieldType) {
      case ConnectionTypeFieldType.Hidden:
      case ConnectionTypeFieldType.File:
      case ConnectionTypeFieldType.ShortText:
      case ConnectionTypeFieldType.Text:
        return (
          <TextForm
            properties={textProperties}
            onChange={(updatedProperties) => setTextProperties(updatedProperties)}
            validate={(value) => validateForType(value, fieldType)}
          />
        );
    }
    return null;
  }, [fieldType, textProperties]);

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
            value={name}
            onChange={(_ev, value) => setName(value)}
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
            value={description}
            onChange={(_ev, value) => setDescription(value)}
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
            value={envVar}
            onChange={(_ev, value) => setEnvVar(value)}
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
            selected={fieldType}
            onSelect={(_e, selection) => {
              if (isConnectionTypeFieldType(selection)) {
                setFieldType(selection);
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
                {fieldTypeLabels[fieldType]}
              </MenuToggle>
            )}
          >
            <SelectList>
              <SelectOption
                value={ConnectionTypeFieldType.ShortText}
                data-testid="field-short-text-select"
              >
                {fieldTypeLabels[ConnectionTypeFieldType.ShortText]}
              </SelectOption>
              <SelectOption
                value={ConnectionTypeFieldType.Hidden}
                data-testid="field-hidden-select"
              >
                {fieldTypeLabels[ConnectionTypeFieldType.Hidden]}
              </SelectOption>
            </SelectList>
          </Select>
        </FormGroup>
        {fieldTypeForm}
        <FormGroup fieldId="isRequired">
          <Checkbox
            id="isRequired"
            data-testid="field-required-checkbox"
            label="Field is required"
            isChecked={required || false}
            onChange={(_ev, checked) => {
              setRequired(checked);
            }}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};
