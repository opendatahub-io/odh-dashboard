import React, { FormEvent } from 'react';
import {
  FormGroup,
  Stack,
  StackItem,
  TextArea,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { NameDescType, K8sNameValidationState, IndeterminateOption } from '~/pages/projects/types';
import { isK8sNameValid, translateDisplayNameForK8s } from '~/pages/projects/utils';
import ToggleResourceName from './ToggleResourceName';
import K8sNameField from './K8sNameField';

type NameDescriptionFieldProps = {
  nameFieldId: string;
  descriptionFieldId: string;
  data: NameDescType;
  setData: (data: NameDescType) => void;
  autoFocusName?: boolean;
  showK8sName?: boolean;
  disableK8sName?: boolean;
};
const combinedValidationStatus = {
  ...ValidatedOptions,
  ...IndeterminateOption,
};

const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({
  nameFieldId,
  descriptionFieldId,
  data,
  setData,
  autoFocusName,
  showK8sName,
  disableK8sName,
}) => {
  const autoSelectNameRef = React.useRef<HTMLInputElement | null>(null);
  const [showHiddenResourceName, setShowHiddenResourceName] = React.useState<boolean | undefined>(
    showK8sName,
  );

  const [validateK8sName, setValidateK8sName] = React.useState<K8sNameValidationState>({
    ruleLength: combinedValidationStatus.indeterminate,
    ruleCharacterTypes: combinedValidationStatus.indeterminate,
  });

  React.useEffect(() => {
    if (autoFocusName) {
      autoSelectNameRef.current?.focus();
    }
  }, [autoFocusName]);

  const handleNameChange = (event: FormEvent<HTMLInputElement>, name: string) => {
    const translatedK8sName = translateDisplayNameForK8s(name);

    if (!disableK8sName && !data.k8sName?.isUserInputK8sName) {
      const k8sNameValue = isK8sNameValid(translatedK8sName)
        ? translatedK8sName
        : translatedK8sName.slice(0, 30);

      setData({
        ...data,
        name,
        k8sName: {
          value: k8sNameValue,
          isTruncated: k8sNameValue.length > 30,
          isUserInputK8sName: false,
        },
      });
      setValidateK8sName({
        ruleCharacterTypes: isK8sNameValid(k8sNameValue)
          ? combinedValidationStatus.success
          : combinedValidationStatus.error,
        ruleLength:
          k8sNameValue.length > 30
            ? combinedValidationStatus.warning
            : combinedValidationStatus.success,
      });
    } else {
      setData({
        ...data,
        name,
      });
      if (name.length === 0 || data.k8sName?.value?.length === 0) {
        setData({
          ...data,
          name,
          k8sName: {
            isTruncated: false,
            isUserInputK8sName: false,
          },
        });
        setValidateK8sName({
          ruleCharacterTypes: combinedValidationStatus.indeterminate,
          ruleLength: combinedValidationStatus.indeterminate,
        });
      }
    }
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup
          label="Name"
          isRequired
          fieldId={nameFieldId}
          labelInfo={
            <ToggleResourceName
              showHiddenResourceName={showHiddenResourceName}
              setShowHiddenResourceName={setShowHiddenResourceName}
            />
          }
        >
          <TextInput
            isRequired
            ref={autoSelectNameRef}
            id={nameFieldId}
            name={nameFieldId}
            value={data.name}
            onChange={handleNameChange}
          />
        </FormGroup>
      </StackItem>
      {showHiddenResourceName && (
        <StackItem>
          <K8sNameField
            data={data}
            setData={setData}
            nameFieldId={nameFieldId}
            disableK8sName={disableK8sName}
            validateK8sName={validateK8sName}
            setValidateK8sName={setValidateK8sName}
          />
        </StackItem>
      )}
      <StackItem>
        <FormGroup label="Description" fieldId={descriptionFieldId}>
          <TextArea
            resizeOrientation="vertical"
            id={descriptionFieldId}
            name={descriptionFieldId}
            value={data.description}
            onChange={(e, description) => setData({ ...data, description })}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default NameDescriptionField;
