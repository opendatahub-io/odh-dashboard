import { DEV_MODE, API_PORT } from './const';
import { OdhDocumentType } from '../types';

export const getBackendURL = (path: string): string => {
  if (!DEV_MODE) {
    return path;
  }
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}${path}`;
};

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

// Returns the possible colors allowed for a patternly-react Label component
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
