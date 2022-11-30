import { OdhApplication, OdhDocument, OdhDocumentType } from '../types';
import { CATEGORY_ANNOTATION, ODH_PRODUCT_NAME } from './const';

/**
 * Feature flags are required in the config -- but upgrades can be mixed and omission of the property
 * usually ends up being enabled. This will prevent that as a general utility.
 */
export const featureFlagEnabled = (disabledSettingState?: boolean): boolean =>
  disabledSettingState === false;

export const makeCardVisible = (id: string): void => {
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, 100);
};

export const getDuration = (minutes = 0): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hoursString = hours > 0 ? `${hours} ${hours > 1 ? 'hours' : 'hour'} ` : '';
  if (hours > 0) {
    return `${hoursString}${mins > 0 ? ' +' : ''}`;
  }

  return mins > 0 ? `${mins} ${mins > 1 ? 'minutes' : 'minute'}` : '';
};

export const calculateRelativeTime = (startTime: Date, endTime: Date): string => {
  const start = startTime.getTime();
  const end = endTime.getTime();

  const secondsAgo = (end - start) / 1000;
  const minutesAgo = secondsAgo / 60;
  const hoursAgo = minutesAgo / 60;

  if (minutesAgo > 90) {
    const count = Math.round(hoursAgo);
    return `about ${count} hours ago`;
  }
  if (minutesAgo > 45) {
    return 'about an hour ago';
  }
  if (secondsAgo > 90) {
    const count = Math.round(minutesAgo);
    return `about ${count} minutes ago`;
  }
  if (secondsAgo > 45) {
    return 'about a minute ago';
  }
  return 'a few seconds ago';
};

// Returns the possible colors allowed for a patternfly-react Label component
// There is no type defined for this so it must be exactly one of the possible strings
// required :/
// FixMe: Fix when https://github.com/patternfly/patternfly-react/issues/5895 is resolved
export const getLabelColorForDocType = (
  docType: string,
): 'blue' | 'cyan' | 'green' | 'orange' | 'purple' | 'red' | 'grey' => {
  switch (docType) {
    case OdhDocumentType.Documentation:
      return 'orange';
    case OdhDocumentType.Tutorial:
      return 'cyan';
    case OdhDocumentType.QuickStart:
      return 'green';
    case OdhDocumentType.HowTo:
      return 'orange';
    default:
      return 'grey';
  }
};
export const combineCategoryAnnotations = (doc: OdhDocument, app: OdhApplication): void => {
  const docCategories = (doc.metadata.annotations?.[CATEGORY_ANNOTATION] ?? '')
    .split(',')
    .map((c) => c.trim());
  const appCategories = (app.metadata.annotations?.[CATEGORY_ANNOTATION] ?? '')
    .split(',')
    .map((c) => c.trim());

  const combined = appCategories.reduce((acc, category) => {
    if (category && !acc.includes(category)) {
      acc.push(category);
    }
    return acc;
  }, docCategories);

  doc.metadata.annotations = {
    ...(doc.metadata.annotations || {}),
    [CATEGORY_ANNOTATION]: combined.join(','),
  };
};

export const matchesCategories = (
  odhDoc: OdhDocument,
  category: string,
  favorites: string[],
): boolean => {
  if (!category) {
    return true;
  }
  if (category === 'Favorites') {
    return favorites.includes(odhDoc.metadata.name);
  }
  return odhDoc.metadata.annotations?.[CATEGORY_ANNOTATION]?.includes(category) ?? false;
};

export const matchesSearch = (odhDoc: OdhDocument, filterText: string): boolean => {
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

export const isRedHatSupported = (app: OdhApplication): boolean => {
  const support = (app.spec.support || '').toLowerCase();
  return support === ODH_PRODUCT_NAME || support === 'redhat' || support === 'red hat';
};

export const getHourAndMinuteByTimeout = (timeout: number): { hour: number; minute: number } => {
  const total_minutes = timeout / 60;
  const hour = Math.floor(total_minutes / 60);
  const minute = total_minutes % 60;
  return { hour, minute };
};

export const getTimeoutByHourAndMinute = (hour: number, minute: number): number =>
  (hour * 60 + minute) * 60;

export const isGroupEmpty = <T extends { enabled: boolean }>(groupList: Array<T>): boolean => {
  return groupList.filter((element) => element.enabled).length === 0;
};

export const getDashboardMainContainer = (): HTMLElement =>
  document.getElementById('dashboard-page-main') || document.body;

export const isHTMLInputElement = (object: unknown): object is HTMLInputElement => {
  return (object as HTMLInputElement).value !== undefined;
};

export const normalizeBetween = (value: number, min?: number, max?: number): number => {
  let returnedValue = value;
  if (min !== undefined && max !== undefined) {
    returnedValue = Math.max(Math.min(value, max), min);
  } else if (min && value <= min) {
    returnedValue = min;
  } else if (max && value >= max) {
    returnedValue = max;
  }
  return Math.floor(returnedValue);
};
