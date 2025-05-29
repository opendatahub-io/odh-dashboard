import * as React from 'react';
import {
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
  UseK8sNameDescriptionDataConfiguration,
  UseK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/types';
import ResourceNameDefinitionTooltip from '~/concepts/k8s/ResourceNameDefinitionTooltip';
import { handleUpdateLogic, setupDefaults } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import ResourceNameField from '~/concepts/k8s/K8sNameDescriptionField/ResourceNameField';
import { CharLimitHelperText } from '~/components/CharLimitHelperText';

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
  onValidationChange?: (isValid: boolean) => void;
  maxLengthName?: number;
  maxLengthDesc?: number;
  hideDescription?: boolean;
};

/**
 * Use in place of any K8s Resource creation / edit.
 * @see useK8sNameDescriptionFieldData
 */
const K8sNameDescriptionField: React.FC<K8sNameDescriptionFieldProps> = ({
  autoFocusName,
  data,
  dataTestId,
  descriptionLabel = 'Description',
  onDataChange,
  onValidationChange,
  nameLabel = 'Name',
  nameHelperText,
  maxLengthName,
  maxLengthDesc,
  hideDescription,
}) => {
  const [showK8sField, setShowK8sField] = React.useState(false);

  const { name, description, k8sName } = data;

  const isValid = React.useMemo(() => {
    const isNameValid = (!name || !maxLengthName || name.length <= maxLengthName) && !!name;
    const isDescValid = !maxLengthDesc || description.length <= maxLengthDesc;
    return isNameValid && isDescValid;
  }, [name, description, maxLengthName, maxLengthDesc]);

  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

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
          onChange={(event, value) => onDataChange?.('name', value)}
          validated={maxLengthName && name.length > maxLengthName ? 'error' : 'default'}
        />
        <HelperText>
          {nameHelperText && <HelperTextItem>{nameHelperText}</HelperTextItem>}
          {maxLengthName && name.length > maxLengthName && (
            <HelperTextItem variant="error">
              <CharLimitHelperText limit={maxLengthName} />
            </HelperTextItem>
          )}
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
            onChange={(event, value) => onDataChange?.('description', value)}
            resizeOrientation="vertical"
            validated={maxLengthDesc && description.length > maxLengthDesc ? 'error' : 'default'}
          />
          {maxLengthDesc && description.length > maxLengthDesc && (
            <HelperText>
              <HelperTextItem variant="error">
                <CharLimitHelperText limit={maxLengthDesc} />
              </HelperTextItem>
            </HelperText>
          )}
        </FormGroup>
      ) : null}
    </>
  );
};

export default K8sNameDescriptionField;
