import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ChangeEvent, FormEvent } from 'react';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
  UseK8sNameDescriptionDataConfiguration,
  UseK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/types';
import ResourceNameDefinitionTooltip from '~/concepts/k8s/ResourceNameDefinitionTooltip';
import {
  handleUpdateLogic,
  K8S_MAX_LENGTH,
  setupDefaults,
} from '~/concepts/k8s/K8sNameDescriptionField/utils';
import ResourceNameField from '~/concepts/k8s/K8sNameDescriptionField/ResourceNameField';

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
  autoFocusName?: boolean;
  data: UseK8sNameDescriptionFieldData['data'];
  dataTestId: string;
  descriptionLabel?: string;
  nameLabel?: string;
  nameHelperText?: React.ReactNode;
  onDataChange?: UseK8sNameDescriptionFieldData['onDataChange'];
  hideDescription?: boolean;
};

// using enum to make the type; cannot use enum directly
type Validate = `${ValidatedOptions}`;
type NameError = 'tooShort' | 'tooLong' | 'none';
const tooLongErrorText = `Must be ${K8S_MAX_LENGTH.toLocaleString()} characters or less.`;
/**
 * Use in place of any K8s Resource creation / edit.
 *
 * this is a pass through
 *
 * @see useK8sNameDescriptionFieldData
 */
const K8sNameDescriptionField: React.FC<K8sNameDescriptionFieldProps> = ({
  autoFocusName,
  data,
  dataTestId,
  descriptionLabel = 'Description',
  onDataChange,
  nameLabel = 'Name',
  nameHelperText,
  hideDescription,
}) => {
  const [showK8sField, setShowK8sField] = React.useState(false);

  const { name, description, k8sName } = data;
  const [nameValidated, setNameValidated] = React.useState<Validate>('default');
  const [descValidated, setDescValidated] = React.useState<Validate>('default');

  const [nameError, setNameError] = React.useState<NameError>('none');

  const onNameChange = (_event: FormEvent<HTMLInputElement>, value: string) => {
    const isValid = value.length > 0 && value.length <= K8S_MAX_LENGTH;

    if (!isValid) {
      const actualNameError =
        value.length && value.length > K8S_MAX_LENGTH ? 'tooLong' : 'tooShort';
      setNameError(actualNameError);
    } else {
      setNameError('none');
    }

    onDataChange?.('name', value);
    if (isValid) {
      setNameValidated('success');
    } else {
      setNameValidated('error');
    }
  };

  const onDescriptionChange = (_event: ChangeEvent<HTMLTextAreaElement>, value: string) => {
    const isValid = value.length <= K8S_MAX_LENGTH;
    onDataChange?.('description', value);

    if (isValid) {
      setDescValidated('success');
    } else {
      setDescValidated('error');
    }
  };

  return (
    <>
      <FormGroup label={nameLabel} isRequired fieldId={`${dataTestId}-name`}>
        <TextInput
          aria-readonly={!onDataChange}
          data-testid={`${dataTestId}-name`}
          id={`${dataTestId}-name`}
          name={`${dataTestId}-name`}
          autoFocus={autoFocusName}
          isRequired
          value={name}
          validated={nameValidated}
          onChange={onNameChange}
        />
        {nameValidated === 'error' && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem icon={<ExclamationCircleIcon />} variant={nameValidated}>
                {nameError === 'tooLong' && tooLongErrorText}
                {nameError === 'tooShort' && 'Required'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
        {nameHelperText || (!showK8sField && !k8sName.state.immutable) ? (
          <HelperText>
            {nameHelperText && <HelperTextItem>{nameHelperText}</HelperTextItem>}
            {!showK8sField && !k8sName.state.immutable && (
              <>
                {k8sName.value && (
                  <HelperTextItem>
                    The resource name will be <b>{k8sName.value}</b>.
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
      {!hideDescription ? (
        <FormGroup label={descriptionLabel} fieldId={`${dataTestId}-description`}>
          <TextArea
            aria-readonly={!onDataChange}
            data-testid={`${dataTestId}-description`}
            id={`${dataTestId}-description`}
            name={`${dataTestId}-description`}
            value={description}
            onChange={onDescriptionChange}
            resizeOrientation="vertical"
            validated={descValidated}
          />
          {descValidated === 'error' && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem icon={<ExclamationCircleIcon />} variant={descValidated}>
                  {tooLongErrorText}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
      ) : null}
    </>
  );
};

export default K8sNameDescriptionField;
