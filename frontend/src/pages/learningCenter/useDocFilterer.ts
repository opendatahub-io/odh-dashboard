import * as React from 'react';
import { useQueryParams } from '#~/utilities/useQueryParams';
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

export const useDocFilterer = (
  favorites: string[],
): ((odhDocs: OdhDocument[]) => OdhDocument[]) => {
  const queryParams = useQueryParams();
  const enabled = queryParams.get(ENABLED_FILTER_KEY);
  const docTypes = queryParams.get(DOC_TYPE_FILTER_KEY);
  const applications = queryParams.get(APPLICATION_FILTER_KEY);
  const providerTypes = queryParams.get(PROVIDER_TYPE_FILTER_KEY);
  const category = queryParams.get(CATEGORY_FILTER_KEY) || '';
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';

  return React.useCallback(
    (odhDocs: OdhDocument[]) =>
      odhDocs
        .filter((odhDoc) => !enabled || enabled.includes(`${odhDoc.spec.appEnabled ?? ''}`))
        .filter((odhDoc) => !docTypes || docTypes.includes(`${odhDoc.spec.type}`))
        .filter(
          (odhDoc) => !applications || applications.includes(`${odhDoc.spec.appDisplayName ?? ''}`),
        )
        .filter(
          (odhDoc) => !providerTypes || providerTypes.includes(`${odhDoc.spec.appCategory ?? ''}`),
        )
        .filter((odhDoc) => matchesCategories(odhDoc, category, favorites))
        .filter((odhDoc) => matchesSearch(odhDoc, searchQuery)),
    [enabled, docTypes, applications, providerTypes, category, favorites, searchQuery],
  );
};
