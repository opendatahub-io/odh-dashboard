import { OdhDocument, OdhDocumentType } from '../../types';

export const SEARCH_FILTER_KEY = 'keyword';
export const DOC_TYPE_FILTER_KEY = 'type';
export const DOC_SORT_KEY = 'sort';
export const DOC_SORT_ORDER_KEY = 'order';

export const SORT_ASC = 'ASC';
export const SORT_DESC = 'DESC';
export const SORT_TYPE_NAME = 'name';
export const SORT_TYPE_TYPE = 'type';

export const getTextForDocType = (docType: OdhDocumentType): string => {
  switch (docType) {
    case OdhDocumentType.Documentation:
      return 'Documentation';
    case OdhDocumentType.Tutorial:
      return 'Tutorial';
    case OdhDocumentType.QuickStart:
      return 'Quick start';
    case OdhDocumentType.HowTo:
      return 'How-to';
    default:
      return 'Documentation';
  }
};

export const doesDocAppMatch = (
  OdhDocument: OdhDocument,
  filterText: string,
  typeFilters: string[],
): boolean => {
  if (typeFilters.length && !typeFilters.includes(OdhDocument.metadata.type)) {
    return false;
  }
  const searchText = filterText.toLowerCase();
  const {
    metadata: { name },
    spec: { displayName, description, appName, provider },
  } = OdhDocument;
  return (
    !searchText ||
    name.toLowerCase().includes(searchText) ||
    (appName && appName.toLowerCase().includes(searchText)) ||
    (provider && provider.toLowerCase().includes(searchText)) ||
    displayName.toLowerCase().includes(searchText) ||
    (description?.toLowerCase().includes(searchText) ?? false)
  );
};
