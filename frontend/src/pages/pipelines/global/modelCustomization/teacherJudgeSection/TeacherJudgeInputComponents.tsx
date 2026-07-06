import React from 'react';
import { FormGroup, TextInput, TextInputProps } from '@patternfly/react-core';
import PasswordInput from '#~/components/PasswordInput';

type TeacherJudgeInputBaseProps = TeacherJudgeInputProps & {
  label: string;
  fieldId: string;
  isPasswordType?: boolean;
};

type TeacherJudgeInputProps = {
  value: string;
  setValue: (value: string) => void;
} & TextInputProps;

export const TeacherEndpointInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  ...props
}) => (
  <TeacherJudgeInputBase
    label="Endpoint"
    fieldId="teacher-endpoint-input"
    value={value}
    setValue={setValue}
    {...props}
  />
);

export const TeacherModelNameInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  ...props
}) => (
  <TeacherJudgeInputBase
    label="Model name"
    fieldId="teacher-model-name-input"
    value={value}
    setValue={setValue}
    {...props}
  />
);

export const TeacherTokenInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  ...props
}) => (
  <TeacherJudgeInputBase
    label="Token"
    fieldId="teacher-token-input"
    value={value}
    setValue={setValue}
    isPasswordType
    {...props}
  />
);

export const JudgeEndpointInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  ...props
}) => (
  <TeacherJudgeInputBase
    label="Endpoint"
    fieldId="judge-endpoint-input"
    value={value}
    setValue={setValue}
    {...props}
  />
);

export const JudgeModelNameInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  ...props
}) => (
  <TeacherJudgeInputBase
    label="Model name"
    fieldId="judge-model-name-input"
    value={value}
    setValue={setValue}
    {...props}
  />
);

export const JudgeTokenInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  ...props
}) => (
  <TeacherJudgeInputBase
    label="Token"
    fieldId="judge-token-input"
    value={value}
    setValue={setValue}
    isPasswordType
    {...props}
  />
);

const TeacherJudgeInputBase: React.FC<TeacherJudgeInputBaseProps> = ({
  label,
  fieldId,
  value,
  setValue,
  isPasswordType,
  ...props
}) => (
  <>
    <FormGroup isRequired label={label} fieldId={fieldId}>
      {isPasswordType ? (
        <PasswordInput
          isRequired
          type="password"
          id={fieldId}
          name={fieldId}
          value={value}
          data-testid={fieldId}
          onChange={(_, newValue) => setValue(newValue)}
          {...props}
        />
      ) : (
        <TextInput
          aria-label={`${label} input`}
          value={value}
          isRequired
          id={fieldId}
          name={fieldId}
          data-testid={fieldId}
          onChange={(_, newValue) => setValue(newValue)}
          {...props}
        />
      )}
    </FormGroup>
  </>
);
