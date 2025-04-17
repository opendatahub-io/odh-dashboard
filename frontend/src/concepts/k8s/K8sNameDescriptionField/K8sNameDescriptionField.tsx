import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
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
  setValid?: (isValid: boolean) => void;
};

type Validate = 'success' | 'warning' | 'error' | 'default';
const makeTooLongErrorText = (fieldName: string) =>
  `Please shorten the ${fieldName}; the maximum length is ${K8S_MAX_LENGTH} characters.`;
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
  setValid,
}) => {
  const [showK8sField, setShowK8sField] = React.useState(false);

  const { name, description, k8sName } = data;
  const [nameValidated, setNameValidated] = React.useState<Validate>('default');
  const [descValidated, setDescValidated] = React.useState<Validate>('default');

  const nameErrorText = makeTooLongErrorText('name');
  const descErrorText = makeTooLongErrorText('description');

  const onNameChange = (event: FormEvent<HTMLInputElement>, value: string) => {
    const isValid = value.length > 0 && value.length < K8S_MAX_LENGTH;
    let newValidity = 'error';
    onDataChange?.('name', value);
    if (isValid) {
      newValidity = 'success';
      setNameValidated('success');
    } else {
      setNameValidated('error');
    }
    if (setValid) {
      setValid(newValidity === 'success' && descValidated === 'success');
    }
  };

  const onDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>, value: string) => {
    const isValid = value.length < K8S_MAX_LENGTH;
    let newValidity = 'error';
    onDataChange?.('description', value);

    if (isValid) {
      setDescValidated('success');
      newValidity = 'success';
    } else {
      setDescValidated('error');
    }

    if (setValid) {
      setValid(newValidity === 'success' && nameValidated === 'success');
    }
  };

  // todo: if too long; add warning text that it is too long (then do it all again for the description)
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
                {nameErrorText}
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
                  {descErrorText}
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
