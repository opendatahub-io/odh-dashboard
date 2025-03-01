import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
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
