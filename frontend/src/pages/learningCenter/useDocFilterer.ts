import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { OdhDocument } from '#~/types';
import { matchesCategories, matchesSearch } from '#~/utilities/utils';
import {
  APPLICATION_FILTER_KEY,
  CATEGORY_FILTER_KEY,
  DOC_TYPE_FILTER_KEY,
  ENABLED_FILTER_KEY,
  PROVIDER_TYPE_FILTER_KEY,
  SEARCH_FILTER_KEY,
} from './const';
import { useQueryFilters } from './useQueryFilters';

export const useDocFilterer = (
  favorites: string[],
): ((odhDocs: OdhDocument[]) => OdhDocument[]) => {
  const [searchParams] = useSearchParams();
  const enabled = searchParams.get(ENABLED_FILTER_KEY);
  const docTypes = useQueryFilters(DOC_TYPE_FILTER_KEY);
  const applications = useQueryFilters(APPLICATION_FILTER_KEY);
  const providerTypes = useQueryFilters(PROVIDER_TYPE_FILTER_KEY);
  const category = searchParams.get(CATEGORY_FILTER_KEY) || '';
  const searchQuery = searchParams.get(SEARCH_FILTER_KEY) || '';
  return React.useCallback(
    (odhDocs: OdhDocument[]) =>
      odhDocs
        .filter((odhDoc) => !enabled || enabled.includes(`${odhDoc.spec.appEnabled ?? ''}`))
        .filter((odhDoc) => docTypes.length === 0 || docTypes.includes(odhDoc.spec.type))
        .filter(
          (odhDoc) =>
            applications.length === 0 || applications.includes(odhDoc.spec.appDisplayName ?? ''),
        )
        .filter(
          (odhDoc) =>
            providerTypes.length === 0 || providerTypes.includes(odhDoc.spec.appCategory ?? ''),
        )
        .filter((odhDoc) => matchesCategories(odhDoc, category, favorites))
        .filter((odhDoc) => matchesSearch(odhDoc, searchQuery)),
    [enabled, docTypes, applications, providerTypes, category, favorites, searchQuery],
  );
};
