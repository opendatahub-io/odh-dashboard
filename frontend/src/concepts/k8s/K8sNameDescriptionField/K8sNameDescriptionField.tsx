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
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
  UseK8sNameDescriptionDataConfiguration,
  UseK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/types';
import ResourceNameDefinitionTooltip from '#~/concepts/k8s/ResourceNameDefinitionTooltip';
import { handleUpdateLogic, setupDefaults } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { HelperTextItemResourceNameTaken } from './HelperTextItemVariants';
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
  autoFocusName?: boolean;
  data: UseK8sNameDescriptionFieldData['data'];
  dataTestId: string;
  descriptionLabel?: string;
  nameLabel?: string;
  nameHelperTextAbove?: React.ReactNode;
  nameHelperText?: React.ReactNode;
  onDataChange?: UseK8sNameDescriptionFieldData['onDataChange'];
  hideDescription?: boolean;
  descriptionHelperText?: React.ReactNode;
  maxLength?: number;
  maxLengthDesc?: number;
  resourceNameTakenHelperText?: React.ReactNode;
  nameChecker?: (resourceName: string) => Promise<boolean> | boolean | null;
  onNameValidationChange?: (status: 'valid' | 'invalid' | 'in progress' | '') => void;
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
  nameLabel = 'Name',
  nameHelperTextAbove,
  nameHelperText,
  hideDescription,
  maxLength,
  maxLengthDesc,
  descriptionHelperText,
  resourceNameTakenHelperText,
  nameChecker,
  onNameValidationChange,
}) => {
  const [showK8sField, setShowK8sField] = React.useState(false);
  const debounceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { name, description, k8sName } = data;

  // Keep a ref to the latest k8sName.value for async access
  const k8sNameRef = React.useRef<string>(k8sName.value);
  React.useEffect(() => {
    k8sNameRef.current = k8sName.value;
  }, [k8sName.value]);

  const showNameWarning = maxLength && name.length > maxLength - 10;
  const showDescWarning = maxLengthDesc && description.length > maxLengthDesc - 250;

  // 'valid': name is available
  // 'invalid': name is taken
  // 'in progress': checking...
  // '': not yet checked
  const [isNameValid, setIsNameValid] = React.useState('');

  // Cleanup debounce timeout on unmount
  React.useEffect(
    () => () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    },
    [],
  );

  const debouncedNameCheck = React.useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (!nameChecker) {
        return;
      }
      const resourceName = k8sNameRef.current;
      if (!resourceName) {
        return;
      }
      setIsNameValid('in progress');
      onNameValidationChange?.('in progress');
      try {
        const result = await nameChecker(resourceName);
        const stringResult = result ? 'valid' : 'invalid';
        setIsNameValid(stringResult);
        onNameValidationChange?.(stringResult);
      } catch {
        setIsNameValid('invalid');
      }
    }, 500);
  }, [nameChecker]);

  const onDisplayNameChange = (value: string) => {
    onDataChange?.('name', value);

    if (nameChecker) {
      debouncedNameCheck();
    }
  };

  const onK8sNameChange = (key: keyof K8sNameDescriptionFieldData, value: string) => {
    onDataChange?.(key, value);
    if (nameChecker) {
      debouncedNameCheck();
    }
  };

  const getNameValidation = (): ValidatedOptions => {
    if (!nameChecker) {
      return ValidatedOptions.default;
    }
    switch (isNameValid) {
      case 'valid':
        return ValidatedOptions.success;
      case 'invalid':
        return ValidatedOptions.error;
      default:
        return ValidatedOptions.default;
    }
  };

  const makeNameFeedback = () => {
    switch (isNameValid) {
      case 'valid':
        return (
          <HelperText>
            <HelperTextItem variant="success">Resource name available</HelperTextItem>
          </HelperText>
        );
      case 'invalid':
        return (
          <HelperText>
            <HelperTextItem variant="error">
              A project with this resource name already exists. Edit the resource name or try a
              different project name
            </HelperTextItem>
          </HelperText>
        );
      case 'in progress':
        return (
          <HelperText>
            <HelperTextItem variant="indeterminate">
              Checking resource name availability...
            </HelperTextItem>
          </HelperText>
        );
      default:
        return null;
    }
  };

  const nameFeedback = makeNameFeedback();

  return (
    <>
      <FormGroup label={nameLabel} isRequired fieldId={`${dataTestId}-name`}>
        {nameHelperTextAbove && (
          <HelperText>
            <HelperTextItem>{nameHelperTextAbove}</HelperTextItem>
          </HelperText>
        )}
        <TextInput
          aria-readonly={!onDataChange}
          data-testid={`${dataTestId}-name`}
          id={`${dataTestId}-name`}
          name={`${dataTestId}-name`}
          autoFocus={autoFocusName}
          isRequired
          isDisabled={isNameValid === 'in progress'}
          validated={getNameValidation()}
          value={name}
          onChange={(event, value) => onDisplayNameChange(value)}
          maxLength={maxLength}
        />
        {showNameWarning && (
          <HelperText>
            <HelperTextItem>
              Cannot exceed {maxLength} characters ({maxLength - name.length} remaining)
            </HelperTextItem>
          </HelperText>
        )}
        {nameChecker && nameFeedback}
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
                  {resourceNameTakenHelperText && (
                    <HelperTextItemResourceNameTaken
                      resourceNameTakenMessage={resourceNameTakenHelperText}
                    />
                  )}
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
        onDataChange={onK8sNameChange}
        resourceNameTakenHelperText={resourceNameTakenHelperText}
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
            maxLength={maxLengthDesc}
          />
          {showDescWarning && (
            <HelperText>
              <HelperTextItem>
                Cannot exceed {maxLengthDesc} characters ({maxLengthDesc - description.length}{' '}
                remaining)
              </HelperTextItem>
            </HelperText>
          )}
          {descriptionHelperText && (
            <HelperText>
              <HelperTextItem>{descriptionHelperText}</HelperTextItem>
            </HelperText>
          )}
        </FormGroup>
      ) : null}
    </>
  );
};

export default K8sNameDescriptionField;
