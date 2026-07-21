import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import React from 'react';
import { UpdateObjectAtPropAndValue, ThemeAwareFormGroupWrapper } from 'mod-arch-shared';
import FormSection from '~/app/pages/modelRegistry/components/pf-overrides/FormSection';
import ThemeAwareFieldset from '~/app/pages/modelRegistry/screens/components/ThemeAwareFieldset';
import { MR_CHARACTER_LIMIT } from './const';
import RegisterModelTypeField from './RegisterModelTypeField';
import { RegisterModelFormData } from './useRegisterModelData';

type RegisterModelDetailsFormSectionProp<D extends RegisterModelFormData> = {
  formData: D;
  setData: UpdateObjectAtPropAndValue<D>;
  hasModelNameError: boolean;
  isModelNameDuplicate?: boolean;
  /** When true (MR register-from-registry), model type is required; submit stays disabled until set. */
  isModelTypeRequired?: boolean;
  /** When true (catalog → MR), model type is prefilled from catalog metadata and is not editable. */
  isModelTypeReadOnly?: boolean;
};
const RegisterModelDetailsFormSection = <D extends RegisterModelFormData>({
  formData,
  setData,
  hasModelNameError,
  isModelNameDuplicate,
  isModelTypeRequired = false,
  isModelTypeReadOnly = false,
}: RegisterModelDetailsFormSectionProp<D>): React.ReactNode => {
  const modelNameInput = (
    <TextInput
      isRequired
      type="text"
      id="model-name"
      name="model-name"
      value={formData.modelName}
      onChange={(_e, value) => setData('modelName', value)}
      validated={hasModelNameError ? 'error' : 'default'}
    />
  );

  const modelDescriptionInput = (
    <TextArea
      type="text"
      id="model-description"
      name="model-description"
      value={formData.modelDescription}
      onChange={(_e, value) => setData('modelDescription', value)}
      autoResize
    />
  );

  const modelNameHelperTextNode = hasModelNameError ? (
    <FormHelperText>
      <HelperText>
        <HelperTextItem variant="error" data-testid="model-name-error">
          {isModelNameDuplicate
            ? 'Model name already exists'
            : `Cannot exceed ${MR_CHARACTER_LIMIT} characters`}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  ) : undefined;

  const modelDescriptionHelperTextNode = (
    <FormHelperText>
      <HelperText>
        <HelperTextItem>Enter a brief summary of the model&apos;s key details.</HelperTextItem>
      </HelperText>
    </FormHelperText>
  );

  return (
    <FormSection
      title="Model details"
      description="Provide model details that apply to every version of this model."
    >
      <ThemeAwareFormGroupWrapper
        label="Model name"
        fieldId="model-name"
        isRequired
        hasError={hasModelNameError}
        helperTextNode={modelNameHelperTextNode}
      >
        {modelNameInput}
      </ThemeAwareFormGroupWrapper>
      <FormGroup label="Model description" fieldId="model-description">
        <ThemeAwareFieldset field="Model Description">{modelDescriptionInput}</ThemeAwareFieldset>
        {modelDescriptionHelperTextNode}
      </FormGroup>
      <RegisterModelTypeField
        modelCustomProperties={formData.modelCustomProperties}
        onModelCustomPropertiesChange={(next) => setData('modelCustomProperties', next)}
        isRequired={isModelTypeRequired}
        isReadOnly={isModelTypeReadOnly}
      />
    </FormSection>
  );
};

export default RegisterModelDetailsFormSection;
