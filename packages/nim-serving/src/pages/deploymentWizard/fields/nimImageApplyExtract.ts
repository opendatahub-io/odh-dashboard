import type { NIMImageFieldValue } from './NIMImageField';
import type { NIMDeployment } from '../../../api/nimservices/types';

export const applyNIMImageFieldData = (
  deployment: NIMDeployment,
  fieldData: NIMImageFieldValue,
): NIMDeployment => ({
  ...deployment,
  model: {
    ...deployment.model,
    spec: {
      ...deployment.model.spec,
      image: {
        ...deployment.model.spec.image,
        repository: fieldData.repository,
        tag: fieldData.tag,
      },
    },
  },
});

export const extractNIMImageFieldData = (
  deployment: NIMDeployment,
): NIMImageFieldValue | undefined => {
  const { repository, tag } = deployment.model.spec.image;
  if (!repository) {
    return undefined;
  }
  return { repository, tag: tag ?? '' };
};
