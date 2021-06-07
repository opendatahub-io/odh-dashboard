import { DEV_MODE, API_PORT } from './const';

const getBackendURL = (path: string): string => {
  if (!DEV_MODE) {
    return path;
  }
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}${path}`;
};

const makeCardVisible = (id: string): void => {
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, 100);
};

const getDuration = (minutes = 0): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hoursString = hours > 0 ? `${hours} ${hours > 1 ? 'hours' : 'hour'} ` : '';
  if (hours > 0) {
    return `${hoursString}${mins > 0 ? ' +' : ''}`;
  }

  return mins > 0 ? `${mins} ${mins > 1 ? 'minutes' : 'minute'}` : '';
};

export { getBackendURL, makeCardVisible, getDuration };
