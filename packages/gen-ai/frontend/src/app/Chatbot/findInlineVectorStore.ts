import { VectorStore } from '~/app/types';

/** Llama Stack can return stores with no metadata despite the API type. */
type VectorStoreFromApi = Omit<VectorStore, 'metadata'> & {
  metadata?: VectorStore['metadata'] | null;
};

const isAutoProvisioned = (store: VectorStoreFromApi): store is VectorStore =>
  store.metadata?.created_by === 'auto-provisioning';

/**
 * The playground-local store created for this signed-in user.
 * Returns nothing until the username is known, and only a store whose
 * metadata.username matches that user. An unlabeled store is not used.
 */
export const findInlineVectorStore = (
  stores: VectorStoreFromApi[],
  username?: string,
): VectorStore | undefined => {
  if (!username) {
    return undefined;
  }
  return stores.find(
    (store): store is VectorStore =>
      isAutoProvisioned(store) && store.metadata.username === username,
  );
};
