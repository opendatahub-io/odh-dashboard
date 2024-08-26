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
  ConnectionTypeDataField,
  connectionTypeDataFields,
  ConnectionTypeFieldType,
} from '~/concepts/connectionTypes/types';
import { fieldNameToEnvVar } from '~/concepts/connectionTypes/utils';
import { isEnumMember } from '~/utilities/utils';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import DataFieldPropertiesForm from '~/pages/connectionTypes/manage/DataFieldPropertiesForm';
import { fieldTypeToString } from '~/concepts/connectionTypes/utils';

const ENV_VAR_NAME_REGEX = new RegExp('^[-._a-zA-Z][-._a-zA-Z0-9]*$');

const isConnectionTypeFieldType = (
  fieldType: string | number | undefined,
): fieldType is ConnectionTypeFieldType =>
  isEnumMember(fieldType?.toString(), ConnectionTypeFieldType);

type Props = {
  field?: ConnectionTypeDataField;
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (field: ConnectionTypeDataField) => void;
  isEdit?: boolean;
};

export const ConnectionTypeDataFieldModal: React.FC<Props> = ({
  field,
  isOpen,
  onClose,
  onSubmit,
  isEdit,
}) => {
  const [name, setName] = React.useState<string>(field?.name || '');
  const [description, setDescription] = React.useState<string | undefined>(field?.description);
  const [envVar, setEnvVar] = React.useState<string>(field?.envVar || '');
  const [fieldType, setFieldType] = React.useState<ConnectionTypeFieldType | undefined>(
    field?.type
      ? // Cast from specific type to generic type
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
        (field.type as ConnectionTypeFieldType)
      : undefined,
  );
  const [required, setRequired] = React.useState<boolean | undefined>(field?.required);
  const [isTypeSelectOpen, setIsTypeSelectOpen] = React.useState<boolean>(false);
  const [properties, setProperties] = React.useState<unknown>(field?.properties || {});
  const [isPropertiesValid, setPropertiesValid] = React.useState(true);

  const [autoGenerateEnvVar, setAutoGenerateEnvVar] = React.useState<boolean>(!envVar);
  const envVarValidation =
    !envVar || ENV_VAR_NAME_REGEX.test(envVar) ? ValidatedOptions.default : ValidatedOptions.error;
  const isValid =
    !!fieldType &&
    isPropertiesValid &&
    !!name &&
    !!envVar &&
    envVarValidation === ValidatedOptions.default;

  const newField = fieldType
    ? // Cast from specific type to generic type
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
      ({
        type: fieldType,
        name,
        description,
        envVar,
        required,
        properties,
      } as ConnectionTypeDataField)
    : undefined;

  const handleSubmit = () => {
    if (isValid) {
      if (newField) {
        onSubmit(newField);
      }
      onClose();
    }
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
          isSubmitDisabled={!isValid}
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
            onChange={(_ev, value) => {
              setName(value);
              if (autoGenerateEnvVar) {
                setEnvVar(fieldNameToEnvVar(value));
              }
            }}
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
            onChange={(_ev, value) => {
              if (autoGenerateEnvVar) {
                setAutoGenerateEnvVar(false);
              }
              setEnvVar(value);
            }}
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
                setProperties({});
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
                {fieldType ? fieldTypeToString(fieldType) : ''}
              </MenuToggle>
            )}
          >
            <SelectList>
              {connectionTypeDataFields
                .map((value) => ({ label: fieldTypeToString(value), value }))
                .toSorted((a, b) => a.label.localeCompare(b.label))
                .map(({ value, label }) => (
                  <SelectOption key={value} value={value} data-testid={`field-${value}-select`}>
                    {label}
                  </SelectOption>
                ))}
            </SelectList>
          </Select>
        </FormGroup>
        {newField ? (
          <DataFieldPropertiesForm
            field={newField}
            onChange={setProperties}
            onValidate={setPropertiesValid}
          />
        ) : undefined}
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
