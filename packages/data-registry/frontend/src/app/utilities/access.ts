import { is403Error } from '~/app/api/dataRegistry';

export const hasDataRegistryWriteAccess = (...errors: Array<Error | undefined>): boolean =>
  !errors.some((error) => is403Error(error));
