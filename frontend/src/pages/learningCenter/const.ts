import { OdhDocumentType } from '#~/types';

export const FAVORITE_RESOURCES = 'odh.dashboard.resources.favorites';

export const SEARCH_FILTER_KEY = 'keyword';
export const DOC_TYPE_FILTER_KEY = 'type';
export const CATEGORY_FILTER_KEY = 'category';
export const ENABLED_FILTER_KEY = 'enabled';
export const APPLICATION_FILTER_KEY = 'provider';
export const PROVIDER_FILTER_KEY = 'provider';
export const PROVIDER_TYPE_FILTER_KEY = 'provider-type';
export const DOC_SORT_KEY = 'sort';
export const DOC_SORT_ORDER_KEY = 'order';

export const SORT_ASC = 'ASC';
export const SORT_DESC = 'DESC';
export const SORT_TYPE_NAME = 'name';
export const SORT_TYPE_TYPE = 'type';
export const SORT_TYPE_APPLICATION = 'application';
export const SORT_TYPE_DURATION = 'duration';

export const CARD_VIEW = 'CARD';
export const LIST_VIEW = 'LIST';

export const VIEW_TYPE = 'rhods.dashboard.resources.viewtype';

export const DOC_TYPE_LABEL = {
  [OdhDocumentType.Documentation]: 'Documentation',
  [OdhDocumentType.Tutorial]: 'Tutorial',
  [OdhDocumentType.QuickStart]: 'Quick start',
  [OdhDocumentType.HowTo]: 'How-to',
};
