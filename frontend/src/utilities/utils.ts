import { LabelProps } from '@patternfly/react-core';
import {
  ContainerResources,
  OdhApplication,
  OdhDocument,
  OdhDocumentType,
  OdhIntegrationApplication,
} from '#~/types';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { CATEGORY_ANNOTATION, DASHBOARD_MAIN_CONTAINER_ID, ODH_PRODUCT_NAME } from './const';

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

/** @deprecated - use relativeTime method */
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
export const getLabelColorForDocType = (docType: string): LabelProps['color'] => {
  switch (docType) {
    case OdhDocumentType.Documentation:
      return 'orange';
    case OdhDocumentType.Tutorial:
      return 'teal';
    case OdhDocumentType.QuickStart:
      return 'green';
    case OdhDocumentType.HowTo:
      return 'orange';
    default:
      return 'grey';
  }
};
export const combineCategoryAnnotations = (
  assignableDoc: OdhDocument,
  app: OdhApplication,
): void => {
  const docCategories = (assignableDoc.metadata.annotations?.[CATEGORY_ANNOTATION] ?? '')
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

  assignableDoc.metadata.annotations = {
    ...(assignableDoc.metadata.annotations || {}),
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
    description.toLowerCase().includes(searchText)
  );
};

export const isRedHatSupported = (app: OdhApplication): boolean => {
  const support = (app.spec.support || '').toLowerCase();
  return support === ODH_PRODUCT_NAME || support === 'redhat' || support === 'red hat';
};

export const getHourAndMinuteByTimeout = (timeout: number): { hour: number; minute: number } => {
  const totalMinutes = timeout / 60;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
};

export const getTimeoutByHourAndMinute = (hour: number, minute: number): number =>
  (hour * 60 + minute) * 60;

export const isGroupEmpty = <T extends { enabled: boolean }>(groupList: Array<T>): boolean =>
  groupList.filter((element) => element.enabled).length === 0;

export const getDashboardMainContainer = (): HTMLElement =>
  document.getElementById(DASHBOARD_MAIN_CONTAINER_ID) || document.body;

export const isHTMLInputElement = (object: unknown): object is HTMLInputElement =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  (object as Partial<HTMLInputElement>).value !== undefined;

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

export const getAcceleratorProfileCount = (
  acceleratorProfile: AcceleratorProfileKind,
  resources: ContainerResources,
): number => Number(resources.requests?.[acceleratorProfile.spec.identifier] ?? 0);

export const enumIterator = <T extends object>(e: T): [keyof T, T[keyof T]][] =>
  Object.entries(e)
    .filter(([key]) => Number.isNaN(Number(key)))
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    .map(([key, value]) => [key as keyof T, value]);

export const asEnumMember = <T extends object>(
  member: T[keyof T] | string | number | undefined | null,
  e: T,
): T[keyof T] | null => (isEnumMember(member, e) ? member : null);

export const isEnumMember = <T extends object>(
  member: T[keyof T] | string | number | undefined | unknown | null,
  e: T,
): member is T[keyof T] => {
  if (member != null) {
    return Object.entries(e)
      .filter(([key]) => Number.isNaN(Number(key)))
      .map(([, value]) => value)
      .includes(member);
  }
  return false;
};

export const isInternalRouteIntegrationsApp = (internalRoute?: string): internalRoute is string =>
  internalRoute?.startsWith('/api/') ?? false;

export const isIntegrationApp = (app: OdhApplication): app is OdhIntegrationApplication =>
  isInternalRouteIntegrationsApp(app.spec.internalRoute);

/**
 * DO NOT KEEP USING this beyond a release.
 *
 * This function is intended ONLY for temporary use during active development against
 * unreleased backend features or custom operator installations. It should be removed
 * before features are released.
 *
 * @param usageExplanation Required explanation of why this temporary safety wrapper is needed
 * @param removalTrackingLink Required link to issue/ticket tracking removal of this usage
 * @param fn The function to safely execute
 * @param defaultValue Fallback value if execution fails
 * @returns The function result or default value
 *
 * @example
 * // Good: Clear explanation of temporary development need with tracking
 * safeExecute(
 *   'Safely checking new DSC spec field that may not exist in current operator version',
 *   'https://issues.redhat.com/browse/RHOAIENG-####',
 *   () => dsc.spec.newField.value,
 *   false,
 * )
 *
 * @example
 * // Bad: Using as general error handling - use proper error handling instead
 * safeExecute(
 *   'Checking user permissions',
 *   'FooBar not a link',
 *   () => user.canEdit,
 *   false,
 * )
 */
export const safeExecute = <T>(
  usageExplanation: string,
  removalTrackingLink: string,
  fn: () => T,
  defaultValue: T,
): T => {
  try {
    return fn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Development safety wrapper used: ${usageExplanation} tracking removal in ${removalTrackingLink}`,
      error,
    );
    return defaultValue;
  }
};
