import { DEV_MODE, API_PORT } from './const';
import { ODHApp } from '../types';

const getBackendURL = (path: string): string => {
  if (!DEV_MODE) {
    return path;
  }
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}${path}`;
};

const isRedHatSupported = (app: ODHApp): boolean => {
  const support = (app.spec.support || '').toLowerCase();
  return support === 'red hat' || support === 'redhat';
};

const makeCardVisible = (id: string): void => {
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, 100);
};

export { getBackendURL, isRedHatSupported, makeCardVisible };
