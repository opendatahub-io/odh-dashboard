import { deletePipelineCR, deleteSecret } from '~/api';
import { ExternalDatabaseSecret } from '~/concepts/pipelines/content/configurePipelinesServer/const';
import { ELYRA_SECRET_NAME } from '~/concepts/pipelines/elyra/const';

export const deleteServer = (namespace: string): Promise<void> =>
  Promise.allSettled([
    deleteSecret(namespace, ExternalDatabaseSecret.NAME),
    deleteSecret(namespace, ELYRA_SECRET_NAME),
    deletePipelineCR(namespace),
  ]).then(() => undefined);
