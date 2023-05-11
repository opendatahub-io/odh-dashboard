import { deletePipelineCR, deleteSecret } from '~/api';
import { EXTERNAL_DATABASE_SECRET } from '~/concepts/pipelines/content/configurePipelinesServer/const';
import { ELYRA_SECRET_NAME } from '~/concepts/pipelines/elyra/const';

export const deleteServer = (namespace: string): Promise<void> =>
  Promise.allSettled([
    deleteSecret(namespace, EXTERNAL_DATABASE_SECRET.NAME),
    deleteSecret(namespace, ELYRA_SECRET_NAME),
    deletePipelineCR(namespace),
  ]).then(() => undefined);
