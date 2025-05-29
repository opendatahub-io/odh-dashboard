import {
  FormGroup,
  HelperTextItem,
  HelperText,
  FormHelperText,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { ZodIssue } from 'zod';
import { JsonInputParam } from '#~/concepts/pipelines/content/createRun/contentSections/ParamsSection/JsonInputParam';
import { NumberInputParam } from '#~/concepts/pipelines/content/createRun/contentSections/ParamsSection/NumberInputParam';
import { RadioInputParam } from '#~/concepts/pipelines/content/createRun/contentSections/ParamsSection/RadioInputParam';
import {
  InputDefinitionParameterType,
  RuntimeConfigParamValue,
} from '#~/concepts/pipelines/kfTypes';
import { FieldValidationProps } from '#~/hooks/useZodFormValidation';
import { ZodErrorHelperText } from './ZodErrorFormHelperText';

type ParamsDefaultFieldsProps = {
  parameterType: InputDefinitionParameterType | undefined;
  inputProps: {
    value: RuntimeConfigParamValue;
    id: string;
    name: string;
    onChange: (
      _event: React.ChangeEvent<unknown> | null,
      newValue: string | number | boolean,
    ) => unknown;
  };
  label: string;
  description: string | undefined;
  isOptional: boolean | undefined;
  validationIssues?: ZodIssue[];
  validationProps?: FieldValidationProps;
};

const ParamsDefaultFields: React.FC<ParamsDefaultFieldsProps> = ({
  parameterType,
  inputProps,
  label,
  description,
  isOptional,
  validationIssues = [],
  validationProps = {},
}) => {
  let input: React.ReactNode;
  switch (parameterType) {
    case InputDefinitionParameterType.INTEGER:
      input = <NumberInputParam {...inputProps} {...validationProps} />;
      break;
    case InputDefinitionParameterType.BOOLEAN:
      input = <RadioInputParam {...inputProps} />;
      break;
    case InputDefinitionParameterType.LIST:
    case InputDefinitionParameterType.STRUCT:
      input = <JsonInputParam {...inputProps} {...validationProps} />;
      break;
    case InputDefinitionParameterType.DOUBLE:
      input = <NumberInputParam isFloat {...inputProps} {...validationProps} />;
      break;
    case InputDefinitionParameterType.STRING:
      input = (
        <TextInput
          data-testid={inputProps.id}
          {...inputProps}
          value={String(inputProps.value ?? '')}
          {...validationProps}
        />
      );
  }
  return (
    <FormGroup
      key={label}
      label={label}
      fieldId={label}
      isRequired={!isOptional}
      data-testid={`${label}-form-group`}
    >
      {input}
      {description && (
        <FormHelperText data-testid={`${label}-helper-text`}>
          <HelperText>
            <HelperTextItem>{description}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
      <ZodErrorHelperText zodIssue={validationIssues} />
    </FormGroup>
  );
};

export default ParamsDefaultFields;
