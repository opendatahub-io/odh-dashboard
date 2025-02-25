import { assembleSecretJudge, assembleSecretTeacher, createSecret } from '~/api';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { SecretKind } from '~/k8sTypes';

export const createTeacherJudgeSecrets = (
  projectName: string,
  teacherData: TeacherJudgeFormData,
  judgeData: TeacherJudgeFormData,
  dryRun: boolean,
): Promise<SecretKind[]> =>
  Promise.all([
    createSecret(
      assembleSecretTeacher(projectName, {
        /* eslint-disable camelcase */
        api_token:
          teacherData.endpointType === ModelCustomizationEndpointType.PRIVATE
            ? teacherData.apiToken
            : '',
        endpoint: teacherData.endpoint,
        model_name: teacherData.modelName,
        /* eslint-enable camelcase */
      }),
      { dryRun },
    ),
    createSecret(
      assembleSecretJudge(projectName, {
        /* eslint-disable camelcase */
        api_token:
          judgeData.endpointType === ModelCustomizationEndpointType.PRIVATE
            ? judgeData.apiToken
            : '',
        endpoint: judgeData.endpoint,
        model_name: judgeData.modelName,
        /* eslint-enable camelcase */
      }),
      { dryRun },
    ),
  ]);
