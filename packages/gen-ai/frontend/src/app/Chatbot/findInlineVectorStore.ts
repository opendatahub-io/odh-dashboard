import { VectorStore } from '~/app/types';

const isAutoProvisioned = (store: VectorStore): boolean =>
  store.metadata.created_by === 'auto-provisioning';

/**
 * The playground-local store created for this signed-in user.
 * Returns nothing until the username is known, and only a store whose
 * metadata.username matches that user. An unlabeled store is not used.
 */
export const findInlineVectorStore = (
  stores: VectorStore[],
  username?: string,
): VectorStore | undefined => {
  if (!username) {
    return undefined;
  }
  return stores.find(
    (store) => isAutoProvisioned(store) && store.metadata.username === username,
  );
};
