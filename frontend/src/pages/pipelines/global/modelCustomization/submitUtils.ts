import { FineTuneTaxonomyType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { SecretKind } from '~/k8sTypes';
import {
  FineTuneTaxonomyFormData,
  ModelCustomizationFormData,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { createAuthSecret, createSShSecret } from './utils';

export const createTaxonomySecret = async (
  data: FineTuneTaxonomyFormData,
  projectName: string,
): Promise<SecretKind> => {
  const promises = (dryRun: boolean) =>
    data.secret.type === FineTuneTaxonomyType.SSH_KEY
      ? createSShSecret(projectName, data.secret.sshKey, dryRun)
      : createAuthSecret(projectName, data.secret.username, data.secret.token, dryRun);

  return new Promise((resolve, reject) => {
    promises(true)
      .then(() =>
        promises(false)
          .then((result) => resolve(result))
          .catch(reject),
      )
      .catch(reject);
  });
};

export const translateIlabFormToPipelineInput = (
  data: ModelCustomizationFormData,
  secretName: string,
): {
  sdg_repo_url: string;
  sdg_repo_secret: string;
} => ({
  // eslint-disable-next-line camelcase
  sdg_repo_url: data.taxonomy.url,
  // eslint-disable-next-line camelcase
  sdg_repo_secret: secretName,
});
