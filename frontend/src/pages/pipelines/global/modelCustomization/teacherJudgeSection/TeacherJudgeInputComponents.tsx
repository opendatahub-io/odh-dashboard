import React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
import PasswordInput from '~/components/PasswordInput';

type TeacherJudgeInputBaseProps = TeacherJudgeInputProps & {
  label: string;
  fieldId: string;
  isPasswordType?: boolean;
};

type TeacherJudgeInputProps = {
  value: string;
  setValue: (value: string) => void;
  validated?: 'success' | 'error' | 'default';
};

export const TeacherEndpointInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  validated,
}) => (
  <TeacherJudgeInputBase
    label="Endpoint"
    fieldId="teacher-endpoint-input"
    value={value}
    setValue={setValue}
    validated={validated}
  />
);

export const TeacherModelNameInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  validated,
}) => (
  <TeacherJudgeInputBase
    label="Model name"
    fieldId="teacher-model-name-input"
    value={value}
    setValue={setValue}
    validated={validated}
  />
);

export const TeacherTokenInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  validated,
}) => (
  <TeacherJudgeInputBase
    label="Token"
    fieldId="teacher-token-input"
    value={value}
    setValue={setValue}
    validated={validated}
    isPasswordType
  />
);

export const JudgeEndpointInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  validated,
}) => (
  <TeacherJudgeInputBase
    label="Endpoint"
    fieldId="judge-endpoint-input"
    value={value}
    setValue={setValue}
    validated={validated}
  />
);

export const JudgeModelNameInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  validated,
}) => (
  <TeacherJudgeInputBase
    label="Model name"
    fieldId="judge-model-name-input"
    value={value}
    setValue={setValue}
    validated={validated}
  />
);

export const JudgeTokenInput: React.FC<TeacherJudgeInputProps> = ({
  value,
  setValue,
  validated,
}) => (
  <TeacherJudgeInputBase
    label="Token"
    fieldId="judge-token-input"
    value={value}
    setValue={setValue}
    validated={validated}
    isPasswordType
  />
);

const TeacherJudgeInputBase: React.FC<TeacherJudgeInputBaseProps> = ({
  label,
  fieldId,
  value,
  setValue,
  isPasswordType,
  validated,
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
          validated={validated}
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
          validated={validated}
        />
      )}
    </FormGroup>
  </>
);
