import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { NameDescType } from '~/pages/projects/types';
import { isValidK8sName, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import ResourceNameDefinitionTooltip from '~/concepts/k8s/ResourceNameDefinitionTooltip';
import { CharLimitHelperText } from '~/components/CharLimitHelperText';

type NameDescriptionFieldProps = {
  nameFieldId: string;
  nameFieldLabel?: string;
  descriptionFieldId: string;
  descriptionFieldLabel?: string;
  data: NameDescType;
  setData?: (data: NameDescType) => void;
  autoFocusName?: boolean;
  K8sLabelName?: string;
  showK8sName?: boolean;
  disableK8sName?: boolean;
  maxLengthName?: number;
  maxLengthDesc?: number;
  nameHelperText?: React.ReactNode;
  hasNameError?: boolean;
  onNameChange?: (value: string) => void;
};

/**
 * Don't use for K8s name anymore -- that functionality is deprecated.
 * @see K8sNameDescriptionField
 */
const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({
  nameFieldId,
  nameFieldLabel = 'Name',
  descriptionFieldId,
  descriptionFieldLabel = 'Description',
  data,
  setData,
  autoFocusName,
  K8sLabelName = 'Resource name',
  showK8sName,
  disableK8sName,
  maxLengthName,
  maxLengthDesc,
  nameHelperText,
  hasNameError,
  onNameChange,
}) => {
  const k8sName = React.useMemo(() => {
    if (showK8sName) {
      return translateDisplayNameForK8s(data.name);
    }

    return '';
  }, [showK8sName, data.name]);

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label={nameFieldLabel} isRequired fieldId={nameFieldId}>
          <TextInput
            aria-readonly={!setData}
            isRequired
            autoFocus={autoFocusName}
            id={nameFieldId}
            data-testid={nameFieldId}
            name={nameFieldId}
            value={data.name}
            onChange={
              setData
                ? (_e, value) => {
                    setData({ ...data, name: value });
                    onNameChange?.(value);
                  }
                : undefined
            }
            maxLength={maxLengthName}
            validated={hasNameError ? 'error' : 'default'}
          />
          {nameHelperText}
          {maxLengthName && <CharLimitHelperText limit={maxLengthName} />}
        </FormGroup>
      </StackItem>
      {showK8sName && (
        <StackItem>
          <FormGroup
            label={K8sLabelName}
            labelIcon={<ResourceNameDefinitionTooltip />}
            isRequired
            fieldId={`resource-${nameFieldId}`}
          >
            <TextInput
              aria-readonly={!setData}
              isRequired
              isDisabled={disableK8sName}
              id={`resource-${nameFieldId}`}
              name={`resource-${nameFieldId}`}
              data-testid={`resource-${nameFieldId}`}
              value={data.k8sName ?? k8sName}
              onChange={
                setData
                  ? (e, value) => {
                      setData({ ...data, k8sName: value });
                    }
                  : undefined
              }
              validated={!isValidK8sName(data.k8sName) ? 'error' : undefined}
            />
            {!disableK8sName && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    {...(!isValidK8sName(data.k8sName) && {
                      icon: <ExclamationCircleIcon />,
                      variant: 'error',
                    })}
                  >
                    {`Must consist of lowercase alphanumeric characters or '-', and must start and
                    end with an alphanumeric character`}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        </StackItem>
      )}
      <StackItem>
        <FormGroup label={descriptionFieldLabel} fieldId={descriptionFieldId}>
          <TextArea
            aria-readonly={!setData}
            resizeOrientation="vertical"
            id={descriptionFieldId}
            data-testid={descriptionFieldId}
            name={descriptionFieldId}
            value={data.description}
            onChange={setData ? (e, description) => setData({ ...data, description }) : undefined}
            maxLength={maxLengthDesc}
          />

          {maxLengthDesc && <CharLimitHelperText limit={maxLengthDesc} />}
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default NameDescriptionField;
