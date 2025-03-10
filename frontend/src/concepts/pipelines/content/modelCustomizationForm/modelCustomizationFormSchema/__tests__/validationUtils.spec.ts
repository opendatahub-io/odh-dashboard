import { buildMockPipelineVersion } from '~/__mocks__';
import { mockIlabPipelineVersion } from '~/__mocks__/mockIlabPipelineVersion';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  pipelineParameterSchema,
  TeacherJudgeFormData,
  teacherJudgeModel,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';

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
  it('should error when the endpoint is not a uri', () => {
    const field: TeacherJudgeFormData = {
      endpointType: ModelCustomizationEndpointType.PRIVATE,
      apiToken: 'test',
      modelName: 'test',
      endpoint: 'not a uri',
    };
    const result = teacherJudgeModel.safeParse(field);
    expect(result.success).toBe(false);
  });
});

describe('Pipeline details', () => {
  it('should validate when required parameters are present', () => {
    const params =
      mockIlabPipelineVersion.pipeline_spec.pipeline_spec?.root.inputDefinitions?.parameters;
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
