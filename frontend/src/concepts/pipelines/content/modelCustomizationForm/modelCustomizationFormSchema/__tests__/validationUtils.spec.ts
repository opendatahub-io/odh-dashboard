import { FineTuneTaxonomyType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTuneTaxonomyFormData,
  fineTuneTaxonomySchema,
  teacherJudgeModel,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';

describe('fineTuneTaxonomySchema', () => {
  it('should error when the url is not present', () => {
    const field: FineTuneTaxonomyFormData = {
      url: '',
      secret: {
        type: FineTuneTaxonomyType.SSH_KEY,
        sshKey: 'data',
      },
    };
    const result = teacherJudgeModel.safeParse(field);
    expect(result.success).toBe(false);
  });

  it('should validate when it is SSh key type with sshKey value', () => {
    const field: FineTuneTaxonomyFormData = {
      url: 'https://github.com',
      secret: {
        type: FineTuneTaxonomyType.SSH_KEY,
        sshKey: 'data',
      },
    };
    const result = fineTuneTaxonomySchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error when it is of type SSH key without sshKey value', () => {
    const field: FineTuneTaxonomyFormData = {
      url: 'https://github.com',
      secret: {
        type: FineTuneTaxonomyType.SSH_KEY,
        sshKey: '',
      },
    };
    const result = fineTuneTaxonomySchema.safeParse(field);
    expect(result.success).toBe(false);
  });

  it('should validate when it is Username and token type  with username and token', () => {
    const field: FineTuneTaxonomyFormData = {
      url: 'https://github.com',
      secret: {
        type: FineTuneTaxonomyType.USERNAME_TOKEN,
        username: 'test',
        token: 'token',
      },
    };
    const result = fineTuneTaxonomySchema.safeParse(field);
    expect(result.success).toBe(true);
  });

  it('should validate when it is Username and token type  with username and token', () => {
    const field: FineTuneTaxonomyFormData = {
      url: 'https://github.com',
      secret: {
        type: FineTuneTaxonomyType.USERNAME_TOKEN,
        username: '',
        token: '',
      },
    };
    const result = fineTuneTaxonomySchema.safeParse(field);
    expect(result.success).toBe(false);
  });
});
