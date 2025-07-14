import { buildMockPipelineVersion } from '#~/__mocks__';

import { ModelCustomizationEndpointType } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  pipelineParameterSchema,
  TeacherJudgeFormData,
  teacherJudgeModel,
} from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { InputDefinitionParameterType } from '#~/concepts/pipelines/kfTypes';
import { createHyperParametersSchema } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/hyperparameterValidationUtils';
import { mockIlabPipelineVersionParameters } from '#~/__mocks__/mockIlabPipelineVersionParameters';

describe('TeacherJudgeSchema', () => {
  it('should validate when it is public without token', () => {
    const field: TeacherJudgeFormData = {
      endpointType: ModelCustomizationEndpointType.PUBLIC,
      apiToken: '',
      modelName: 'test',
      endpoint: 'http://test.com',
    };
    const result = teacherJudgeModel.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error when it is private without token', () => {
    const field: TeacherJudgeFormData = {
      endpointType: ModelCustomizationEndpointType.PRIVATE,
      apiToken: '',
      modelName: 'test',
      endpoint: 'http://test.com',
    };
    const result = teacherJudgeModel.safeParse(field);
    expect(result.success).toBe(false);
  });

  it('should validate when it is private with token', () => {
    const field: TeacherJudgeFormData = {
      endpointType: ModelCustomizationEndpointType.PRIVATE,
      apiToken: 'test',
      modelName: 'test',
      endpoint: 'http://test.com',
    };
    const result = teacherJudgeModel.safeParse(field);
    expect(result.success).toBe(true);
  });
});

describe('hyperparameterFieldSchema', () => {
  it('should validate with correct parameters', () => {
    const hyperparameter = {
      defaultValue: 30,
      description: 'SDG parameter. The total number of instructions to be generated.',
      isOptional: false,
      parameterType: InputDefinitionParameterType.INTEGER,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: 30 });
    expect(result.success).toBe(true);
  });

  it('should not validate when default value is a decimal when it should have been an integer', () => {
    const hyperparameter = {
      defaultValue: 30.78,
      description: 'SDG parameter. The total number of instructions to be generated.',
      isOptional: false,
      parameterType: InputDefinitionParameterType.INTEGER,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: 30.78 });
    expect(result.success).toBe(false);
  });

  it('should not validate when default value is negative', () => {
    const hyperparameter = {
      defaultValue: -0.0012345678,
      description: 'SDG parameter. The total number of instructions to be generated.',
      isOptional: false,
      parameterType: InputDefinitionParameterType.INTEGER,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: -0.0012345678 });
    expect(result.success).toBe(false);
  });

  it('should validate if evaluation field is auto', () => {
    const hyperparameter = {
      defaultValue: 'auto',
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: false,
      parameterType: InputDefinitionParameterType.STRING,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: 'auto' });
    expect(result.success).toBe(true);
  });

  it('should validate if evaluation field is a valid number', () => {
    const hyperparameter = {
      defaultValue: '54',
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: false,
      parameterType: InputDefinitionParameterType.STRING,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: '54' });
    expect(result.success).toBe(true);
  });

  it('should validate if the hyperparameter field is optional and the defaultValue is undefined', () => {
    const hyperparameter = {
      defaultValue: undefined,
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: true,
      parameterType: InputDefinitionParameterType.STRING,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: undefined });
    expect(result.success).toBe(true);
  });

  it('should validate if the hyperparameter field is optional and the defaultValue is an empty string', () => {
    const hyperparameter = {
      defaultValue: '',
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: true,
      parameterType: InputDefinitionParameterType.STRING,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: '' });
    expect(result.success).toBe(true);
  });

  it('should validate if the hyperparameter field is a boolean', () => {
    const hyperparameter = {
      defaultValue: true,
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: false,
      parameterType: InputDefinitionParameterType.BOOLEAN,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: true });
    expect(result.success).toBe(true);
  });

  it('should invalidate if the hyperparameter field is a required empty string', () => {
    const hyperparameter = {
      defaultValue: '',
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: false,
      parameterType: InputDefinitionParameterType.STRING,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: '' });
    expect(result.success).toBe(false);
  });

  it('should invalidate if the hyperparameter field is required and undefined', () => {
    const hyperparameter = {
      defaultValue: undefined,
      description:
        "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
      isOptional: false,
      parameterType: InputDefinitionParameterType.STRING,
    };
    const schema = createHyperParametersSchema({
      param: hyperparameter,
    });
    const result = schema.safeParse({ param: undefined });
    expect(result.success).toBe(false);
  });
});

describe('Pipeline details', () => {
  it('should validate when required parameters are present', () => {
    const params = mockIlabPipelineVersionParameters;
    const result = pipelineParameterSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('should validate when required parameters are absent', () => {
    const params =
      buildMockPipelineVersion().pipeline_spec.pipeline_spec?.root.inputDefinitions?.parameters;
    const result = pipelineParameterSchema.safeParse(params);
    expect(result.success).toBe(false);
  });
});
