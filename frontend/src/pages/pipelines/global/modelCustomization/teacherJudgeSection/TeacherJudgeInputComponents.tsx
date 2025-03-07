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
};

export const TeacherEndpointInput: React.FC<TeacherJudgeInputProps> = ({ value, setValue }) => (
  <TeacherJudgeInputBase
    label="Teacher endpoint"
    fieldId="teacher-endpoint-input"
    value={value}
    setValue={setValue}
  />
);

export const TeacherModelNameInput: React.FC<TeacherJudgeInputProps> = ({ value, setValue }) => (
  <TeacherJudgeInputBase
    label="Model name"
    fieldId="teacher-model-name-input"
    value={value}
    setValue={setValue}
  />
);

export const TeacherTokenInput: React.FC<TeacherJudgeInputProps> = ({ value, setValue }) => (
  <TeacherJudgeInputBase
    label="Token"
    fieldId="teacher-token-input"
    value={value}
    setValue={setValue}
    isPasswordType
  />
);

export const JudgeEndpointInput: React.FC<TeacherJudgeInputProps> = ({ value, setValue }) => (
  <TeacherJudgeInputBase
    label="Judge endpoint"
    fieldId="judge-endpoint-input"
    value={value}
    setValue={setValue}
  />
);

export const JudgeModelNameInput: React.FC<TeacherJudgeInputProps> = ({ value, setValue }) => (
  <TeacherJudgeInputBase
    label="Model name"
    fieldId="judge-model-name-input"
    value={value}
    setValue={setValue}
  />
);

export const JudgeTokenInput: React.FC<TeacherJudgeInputProps> = ({ value, setValue }) => (
  <TeacherJudgeInputBase
    label="Token"
    fieldId="judge-token-input"
    value={value}
    setValue={setValue}
    isPasswordType
  />
);

const TeacherJudgeInputBase: React.FC<TeacherJudgeInputBaseProps> = ({
  label,
  fieldId,
  value,
  setValue,
  isPasswordType,
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
        />
      )}
    </FormGroup>
  </>
);
