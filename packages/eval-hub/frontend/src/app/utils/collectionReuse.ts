import isEqual from 'lodash-es/isEqual';
import { getCollections } from '~/app/api/k8s';
import type { Collection } from '~/app/types';

const COLLECTION_PAGE_SIZE = 100;

const getCollectionContent = (collection: Collection) => ({
  name: collection.name,
  category: collection.category,
  description: collection.description,
  tags: collection.tags,
  domains: collection.domains,
  tasks: collection.tasks,
  modalities: collection.modalities,
  industries: collection.industries,
  // eslint-disable-next-line camelcase
  evaluation_targets: collection.evaluation_targets,
  custom: collection.custom,
  // eslint-disable-next-line camelcase
  pass_criteria: collection.pass_criteria,
  benchmarks: collection.benchmarks,
});

export const isReusableCollectionCopy = (
  sourceCollection: Collection,
  candidateCollection: Collection,
): boolean =>
  candidateCollection.state?.derived_from === sourceCollection.resource.id &&
  isEqual(getCollectionContent(candidateCollection), getCollectionContent(sourceCollection));

export const getAllTenantCollections = async (
  namespace: string,
  signal?: AbortSignal,
): Promise<Collection[]> => {
  const collections: Collection[] = [];
  let offset: number | undefined = 0;

  while (offset !== undefined) {
    const response = await getCollections('', {
      namespace,
      scope: 'tenant',
      limit: COLLECTION_PAGE_SIZE,
      offset,
    })({ signal });

    collections.push(...response.items);

    offset =
      response.items.length === COLLECTION_PAGE_SIZE &&
      (response.total_count == null || collections.length < response.total_count)
        ? offset + response.items.length
        : undefined;
  }

  return collections;
};

export const findReusableCollectionCopy = async (
  sourceCollection: Collection,
  namespace: string,
  signal?: AbortSignal,
): Promise<Collection | undefined> => {
  const tenantCollections = await getAllTenantCollections(namespace, signal);
  return tenantCollections.find((candidate) =>
    isReusableCollectionCopy(sourceCollection, candidate),
  );
};
