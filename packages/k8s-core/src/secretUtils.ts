import { genRandomChars } from './k8sResourceUtils';

export const DATA_CONNECTION_PREFIX = 'aws-connection';
export const SECRET_PREFIX = 'secret-';

export const getGeneratedSecretName = (): string => `${SECRET_PREFIX}${genRandomChars()}`;
export const isGeneratedSecretName = (name: string): boolean =>
  new RegExp(`^${SECRET_PREFIX}[a-z0-9]{6}$`).test(name);
