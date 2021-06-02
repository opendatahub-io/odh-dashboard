import { ODHDoc, ODHDocType } from '../../types';

export const SEARCH_FILTER_KEY = 'keyword';
export const DOC_TYPE_FILTER_KEY = 'type';
export const DOC_SORT_KEY = 'sort';
export const DOC_SORT_ORDER_KEY = 'order';

export const SORT_ASC = 'ASC';
export const SORT_DESC = 'DESC';
export const SORT_TYPE_NAME = 'name';
export const SORT_TYPE_TYPE = 'type';
export const SORT_TYPE_APPLICATION = 'application';
export const SORT_TYPE_DURATION = 'duration';

export const getTextForDocType = (docType: ODHDocType): string => {
  switch (docType) {
    case ODHDocType.Documentation:
      return 'Documentation';
    case ODHDocType.Tutorial:
      return 'Tutorial';
    case ODHDocType.QuickStart:
      return 'Quick start';
    case ODHDocType.HowTo:
      return 'How-to';
    default:
      return 'Documentation';
  }
};

export const doesDocAppMatch = (
  odhDoc: ODHDoc,
  filterText: string,
  typeFilters: string[],
): boolean => {
  if (typeFilters.length && !typeFilters.includes(odhDoc.metadata.type)) {
    return false;
  }
  const searchText = filterText.toLowerCase();
  const {
    metadata: { name },
    spec: { displayName, description, appName, provider },
  } = odhDoc;
  return (
    !searchText ||
    name.toLowerCase().includes(searchText) ||
    (appName && appName.toLowerCase().includes(searchText)) ||
    (provider && provider.toLowerCase().includes(searchText)) ||
    displayName.toLowerCase().includes(searchText) ||
    (description?.toLowerCase().includes(searchText) ?? false)
  );
};
