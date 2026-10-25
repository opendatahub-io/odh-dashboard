import { VectorStore } from '~/app/types';

/**
 * The playground-local store created for file upload.
 * When username is known, prefer that user's store. Stores created before username
 * metadata existed are still eligible.
 */
export const findInlineVectorStore = (
  stores: VectorStore[],
  username?: string,
): VectorStore | undefined =>
  stores.find(
    (store) =>
      store.metadata.created_by === 'auto-provisioning' &&
      (!username || !store.metadata.username || store.metadata.username === username),
  );
