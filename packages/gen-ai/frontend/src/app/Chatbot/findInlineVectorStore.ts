import { VectorStore } from '~/app/types';

const isAutoProvisioned = (store: VectorStore): boolean =>
  store.metadata.created_by === 'auto-provisioning';

/**
 * The playground-local store created for this signed-in user.
 * Returns nothing until the username is known. An exact username match wins.
 * A store with no username metadata is used only when no exact match exists.
 */
export const findInlineVectorStore = (
  stores: VectorStore[],
  username?: string,
): VectorStore | undefined => {
  if (!username) {
    return undefined;
  }
  const eligible = stores.filter(isAutoProvisioned);
  return (
    eligible.find((store) => store.metadata.username === username) ??
    eligible.find((store) => !store.metadata.username)
  );
};
