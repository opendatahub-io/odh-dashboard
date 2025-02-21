import { assembleSecret, createSecret } from '~/api';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { SecretKind } from '~/k8sTypes';

export const createTeacherJudgeSecrets = (
  projectName: string,
  teacherData: TeacherJudgeFormData,
  judgeData: TeacherJudgeFormData,
): Promise<SecretKind[]> => {
  const promises = (dryRun: boolean) =>
    // TODO: change the secret names after it's decided
    Promise.all([
      createSecret(
        assembleSecret(
          projectName,
          {
            /* eslint-disable camelcase */
            api_token:
              teacherData.endpointType === ModelCustomizationEndpointType.PRIVATE
                ? teacherData.apiToken
                : '',
            endpoint: teacherData.endpoint,
            model_name: teacherData.modelName,
            /* eslint-enable camelcase */
          },
          'generic',
          'wip-teacher-secret',
        ),
        { dryRun },
      ),
      createSecret(
        assembleSecret(
          projectName,
          {
            /* eslint-disable camelcase */
            api_token:
              judgeData.endpointType === ModelCustomizationEndpointType.PRIVATE
                ? judgeData.apiToken
                : '',
            endpoint: judgeData.endpoint,
            model_name: judgeData.modelName,
            /* eslint-enable camelcase */
          },
          'generic',
          'wip-judge-secret',
        ),
        { dryRun },
      ),
    ]);
  return new Promise((resolve, reject) => {
    promises(true)
      .then(() =>
        promises(false)
          .then((results) => resolve(results))
          .catch(reject),
      )
      .catch(reject);
  });
};
