import { is403Error } from '~/app/api/dataRegistry';

export const hasDataRegistryWriteAccess = (
  assetsError: Error | undefined,
  collectionsError: Error | undefined,
): boolean => !is403Error(assetsError) && !is403Error(collectionsError);
