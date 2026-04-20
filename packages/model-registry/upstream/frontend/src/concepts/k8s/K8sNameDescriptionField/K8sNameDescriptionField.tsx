import * as React from 'react';
import {
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import ResourceNameDefinitionTooltip from '~/concepts/k8s/ResourceNameDefinitionTooltip';
import FormFieldset from '~/app/pages/modelRegistry/screens/components/FormFieldset';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
  UseK8sNameDescriptionDataConfiguration,
  UseK8sNameDescriptionFieldData,
} from './types';
import {
  handleUpdateLogic,
  setupDefaults,
  getMaxLengthErrorMessage,
  INVALID_K8S_NAME_CHARACTERS_MESSAGE,
} from './utils';
import ResourceNameField from './ResourceNameField';

/** Companion data hook */
export const useK8sNameDescriptionFieldData = (
  configuration: UseK8sNameDescriptionDataConfiguration = {},
): UseK8sNameDescriptionFieldData => {
  const [data, setData] = React.useState<K8sNameDescriptionFieldData>(() =>
    setupDefaults(configuration),
  );

  const onDataChange = React.useCallback<K8sNameDescriptionFieldUpdateFunction>((key, value) => {
    setData((currentData) => handleUpdateLogic(currentData)(key, value));
  }, []);

  return { data, onDataChange };
};

type K8sNameDescriptionFieldProps = {
  data: UseK8sNameDescriptionFieldData['data'];
  onDataChange?: UseK8sNameDescriptionFieldData['onDataChange'];
  dataTestId: string;
  descriptionLabel?: string;
  nameLabel?: string;
  nameHelperText?: React.ReactNode;
  hideDescription?: boolean;
};

/**
 * Use in place of any K8s Resource creation / edit.
 * @see useK8sNameDescriptionFieldData
 */
const K8sNameDescriptionField: React.FC<K8sNameDescriptionFieldProps> = ({
  data,
  onDataChange,
  dataTestId,
  descriptionLabel = 'Description',
  nameLabel = 'Name',
  nameHelperText,
  hideDescription,
}) => {
  const [showK8sField, setShowK8sField] = React.useState(false);

  const { name, description, k8sName } = data;

  const hasEmptyResourceName = !!name && !k8sName.value && !k8sName.state.immutable;
  const hasHiddenValidationError =
    !showK8sField &&
    !k8sName.state.immutable &&
    (k8sName.state.invalidLength || k8sName.state.invalidCharacters);
  const hasNameError = hasEmptyResourceName || hasHiddenValidationError;

  const nameInput = (
    <TextInput
      aria-readonly={!onDataChange}
      data-testid={`${dataTestId}-name`}
      id={`${dataTestId}-name`}
      name={`${dataTestId}-name`}
      value={name}
      onChange={(_e, value) => onDataChange?.('name', value)}
      isRequired
      validated={hasNameError ? ValidatedOptions.error : ValidatedOptions.default}
    />
  );

  const descriptionTextArea = (
    <TextArea
      aria-readonly={!onDataChange}
      data-testid={`${dataTestId}-description`}
      id={`${dataTestId}-description`}
      name={`${dataTestId}-description`}
      type="text"
      value={description}
      onChange={(_e, value) => onDataChange?.('description', value)}
      resizeOrientation="vertical"
      autoResize
    />
  );

  return (
    <>
      <FormGroup label={nameLabel} isRequired fieldId={`${dataTestId}-name`}>
        <FormFieldset component={nameInput} field="Name" />
        {nameHelperText || (!showK8sField && !k8sName.state.immutable) ? (
          <HelperText data-testid={`${dataTestId}-name-helper`}>
            {nameHelperText && <HelperTextItem>{nameHelperText}</HelperTextItem>}
            {!showK8sField && !k8sName.state.immutable && (
              <>
                {hasEmptyResourceName ? (
                  <HelperTextItem variant="error">
                    The name must contain at least one alphanumeric character.
                  </HelperTextItem>
                ) : k8sName.value ? (
                  <HelperTextItem>
                    The resource name will be <b>{k8sName.value}</b>.
                  </HelperTextItem>
                ) : null}
                {k8sName.state.invalidLength && (
                  <HelperTextItem variant="error">
                    {getMaxLengthErrorMessage(k8sName.state.maxLength)}
                  </HelperTextItem>
                )}
                {k8sName.state.invalidCharacters && (
                  <HelperTextItem variant="error">
                    {INVALID_K8S_NAME_CHARACTERS_MESSAGE}
                  </HelperTextItem>
                )}
                <HelperTextItem>
                  <Button
                    data-testid={`${dataTestId}-editResourceLink`}
                    variant="link"
                    isInline
                    onClick={() => setShowK8sField(true)}
                  >
                    Edit resource name
                  </Button>{' '}
                  <ResourceNameDefinitionTooltip />
                </HelperTextItem>
              </>
            )}
          </HelperText>
        ) : null}
      </FormGroup>

      <ResourceNameField
        allowEdit={showK8sField}
        dataTestId={dataTestId}
        k8sName={k8sName}
        onDataChange={onDataChange}
      />

      {!hideDescription && (
        <FormGroup label={descriptionLabel} fieldId={`${dataTestId}-description`}>
          <FormFieldset component={descriptionTextArea} field="Description" />
        </FormGroup>
      )}
    </>
  );
};

export default K8sNameDescriptionField;
