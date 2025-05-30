import * as React from 'react';
import {
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
  TextArea,
  TextInput,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import {
  ConnectionTypeDataField,
  connectionTypeDataFields,
  ConnectionTypeField,
  ConnectionTypeFieldType,
} from '#~/concepts/connectionTypes/types';
import {
  fieldNameToEnvVar,
  fieldTypeToString,
  isConnectionTypeDataField,
  isValidEnvVar,
} from '#~/concepts/connectionTypes/utils';
import { isEnumMember } from '#~/utilities/utils';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import DataFieldPropertiesForm from '#~/pages/connectionTypes/manage/DataFieldPropertiesForm';
import { prepareFieldForSave } from '#~/pages/connectionTypes/manage/manageFieldUtils';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';

const isConnectionTypeFieldType = (
  fieldType: string | number | undefined,
): fieldType is ConnectionTypeFieldType =>
  isEnumMember(fieldType?.toString(), ConnectionTypeFieldType);

type Props = {
  field?: ConnectionTypeDataField;
  onClose: () => void;
  onSubmit: (field: ConnectionTypeDataField) => void;
  isEdit?: boolean;
  fields?: ConnectionTypeField[];
};

export const ConnectionTypeDataFieldModal: React.FC<Props> = ({
  field,
  onClose,
  onSubmit,
  isEdit,
  fields,
}) => {
  const [data, setData] = useGenericObjectState({
    name: field?.name || '',
    description: field?.description,
    envVar: field?.envVar || '',
    fieldType: field?.type
      ? // Cast from specific type to generic type
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
        (field.type as ConnectionTypeFieldType)
      : ConnectionTypeFieldType.ShortText,
    required: field?.required,
    properties: field?.properties || {},
  });
  const canSubmit = React.useRef(data).current !== data || !isEdit;
  const { name, description, envVar, fieldType, required, properties } = data;

  const [isPropertiesValid, setPropertiesValid] = React.useState(true);
  const [autoGenerateEnvVar, setAutoGenerateEnvVar] = React.useState(!envVar);

  const isEnvVarConflict = React.useMemo(
    () => !!fields?.find((f) => f !== field && isConnectionTypeDataField(f) && f.envVar === envVar),
    [fields, field, envVar],
  );

  const isEnvVarValid = !envVar || isValidEnvVar(envVar);

  const isValid = isPropertiesValid && !!name && !!envVar;

  // Cast from specific type to generic type
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
  const newField = {
    type: fieldType,
    name,
    description,
    envVar,
    required,
    properties,
  } as ConnectionTypeDataField;

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(prepareFieldForSave(newField));
      onClose();
    }
  };

  return (
    <Modal
      isOpen
      variant="medium"
      onClose={onClose}
      data-testid="archive-model-version-modal"
      elementToFocus="#name"
    >
      <ModalHeader title={isEdit ? 'Edit field' : 'Add field'} />
      <ModalBody>
        <Form>
          <FormGroup fieldId="name" label="Name" isRequired>
            <TextInput
              id="name"
              value={name}
              onChange={(_ev, value) => {
                setData('name', value);
                if (autoGenerateEnvVar) {
                  setData('envVar', fieldNameToEnvVar(value));
                }
              }}
              data-testid="field-name-input"
            />
          </FormGroup>
          <FormGroup
            fieldId="description"
            label="Description"
            labelHelp={
              <Popover
                aria-label="description help"
                headerContent="Description"
                bodyContent="Use the description to provide users in your organization with additional information about a field, or instructions for completing the field. Your input will appear in a popover, like this one."
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
              onChange={(_ev, value) => setData('description', value)}
            />
          </FormGroup>
          <FormGroup
            fieldId="envVar"
            label="Environment variable"
            labelHelp={
              <Popover
                aria-label="environment variable help"
                headerContent="Environment variable"
                bodyContent="Environment variables are how the system references the field value in a workbench or model server. Your input will appear in a popover, like this one. "
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
                setData('envVar', value);
              }}
              data-testid="field-env-var-input"
              validated={!isEnvVarValid || isEnvVarConflict ? 'warning' : 'default'}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem
                  variant={isEnvVarValid ? 'default' : 'warning'}
                  icon={isEnvVarValid ? undefined : <WarningTriangleIcon />}
                >
                  For highest compatibility, field must consist of alphanumeric characters, ( - ), (
                  _ ), or ( . )
                </HelperTextItem>
              </HelperText>
              {isEnvVarConflict ? (
                <HelperText data-testid="envvar-conflict-warning">
                  <HelperTextItem icon={<WarningTriangleIcon />} variant="warning">
                    {envVar} already exists within this connection type. Try a different name.
                  </HelperTextItem>
                </HelperText>
              ) : undefined}
            </FormHelperText>
          </FormGroup>
          <FormGroup fieldId="fieldType" label="Type" isRequired data-testid="field-type-select">
            <SimpleSelect
              id="fieldType"
              onChange={(selection) => {
                if (isConnectionTypeFieldType(selection)) {
                  setPropertiesValid(true);
                  setData('properties', {});
                  // setProperties({});
                  setData('fieldType', selection);
                  // setFieldType(selection);
                }
              }}
              options={connectionTypeDataFields
                .map((value) => ({ label: fieldTypeToString(value), value }))
                .toSorted((a, b) => a.label.localeCompare(b.label))
                .map(
                  ({ value, label }): SimpleSelectOption => ({
                    key: value,
                    label: value,
                    dropdownLabel: label,
                    dataTestId: `field-${value}-select`,
                  }),
                )}
              shouldFocusToggleOnSelect
              isFullWidth
              value={fieldType}
              toggleLabel={fieldTypeToString(fieldType)}
            />
          </FormGroup>
          <DataFieldPropertiesForm
            field={newField}
            onChange={(value) => setData('properties', value)}
            onValidate={setPropertiesValid}
          />
          <FormGroup fieldId="isRequired">
            <Checkbox
              id="isRequired"
              data-testid="field-required-checkbox"
              label="Field is required"
              isChecked={required || false}
              onChange={(_ev, checked) => {
                setData('required', checked);
              }}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Save' : 'Add'}
          isSubmitDisabled={!canSubmit || !isValid}
          alertTitle="Error"
        />
      </ModalFooter>
    </Modal>
  );
};
