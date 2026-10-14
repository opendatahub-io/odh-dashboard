import isEqual from 'lodash-es/isEqual';
import { getCollections } from '~/app/api/k8s';
import type { Collection } from '~/app/types';

const COLLECTION_PAGE_SIZE = 100;
const MAX_COLLECTION_PAGES = 100;
const COLLECTION_LOOKUP_ERROR = 'Unable to complete tenant collection lookup';

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

const getCollectionDerivedFrom = (collection: Collection): string | undefined =>
  collection.derived_from ?? collection.state?.derived_from;

export const isReusableCollectionCopy = (
  sourceCollection: Collection,
  candidateCollection: Collection,
): boolean =>
  getCollectionDerivedFrom(candidateCollection) === sourceCollection.resource.id &&
  isEqual(getCollectionContent(candidateCollection), getCollectionContent(sourceCollection));

export const getAllTenantCollections = async (
  namespace: string,
  signal?: AbortSignal,
): Promise<Collection[]> => {
  const collections: Collection[] = [];
  const collectionIds = new Set<string>();
  let offset: number | undefined = 0;
  let pageCount = 0;

  while (offset !== undefined && pageCount < MAX_COLLECTION_PAGES) {
    pageCount += 1;
    const response = await getCollections('', {
      namespace,
      scope: 'tenant',
      limit: COLLECTION_PAGE_SIZE,
      offset,
    })({ signal });

    const newItems = response.items.filter(({ resource }) => !collectionIds.has(resource.id));
    if (newItems.length === 0) {
      if (response.total_count != null && collections.length < response.total_count) {
        throw new Error(
          `${COLLECTION_LOOKUP_ERROR}: collection page repeated before all collections were fetched`,
        );
      }
      offset = undefined;
      break;
    }

    collections.push(...newItems);
    newItems.forEach(({ resource }) => collectionIds.add(resource.id));

    // A short page normally means the end of the list. Fail closed when the server still reports
    // more collections, so a partial scan is never treated as a completed lookup and the run flow
    // cannot miss an existing reusable copy and clone a duplicate.
    if (
      response.items.length < COLLECTION_PAGE_SIZE &&
      response.total_count != null &&
      collections.length < response.total_count
    ) {
      throw new Error(
        `${COLLECTION_LOOKUP_ERROR}: collection page ended before all collections were fetched`,
      );
    }

    offset =
      response.items.length === COLLECTION_PAGE_SIZE &&
      (response.total_count == null || collections.length < response.total_count)
        ? offset + response.items.length
        : undefined;
  }

  if (offset !== undefined) {
    throw new Error(`${COLLECTION_LOOKUP_ERROR}: maximum page limit reached`);
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
