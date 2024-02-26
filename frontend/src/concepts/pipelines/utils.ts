import { deletePipelineCR, deleteSecret } from '~/api';
import { ExternalDatabaseSecret } from '~/concepts/pipelines/content/configurePipelinesServer/const';
import { ELYRA_SECRET_NAME } from '~/concepts/pipelines/elyra/const';
import { allSettledPromises } from '~/utilities/allSettledPromises';

export const deleteServer = (namespace: string): Promise<void> =>
  allSettledPromises([
    deleteSecret(namespace, ExternalDatabaseSecret.NAME),
    deleteSecret(namespace, ELYRA_SECRET_NAME),
    deletePipelineCR(namespace),
  ]).then(() => undefined);
