import type { UserAuthConfig } from '../../../cypress/cypress/types';
import {
  parseObservabilityContract,
  type ObservabilityContract,
} from '../../src/utils/observabilityContract';

export * from '../../src/utils/observabilityContract';

export const loadObservabilityContract = (): ObservabilityContract | undefined => {
  const rawContract: unknown = Cypress.env('CY_OBSERVABILITY_CONTRACT');
  if (rawContract === undefined || rawContract === null || rawContract === '') {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = typeof rawContract === 'string' ? JSON.parse(rawContract) : rawContract;
  } catch {
    throw new Error('CY_OBSERVABILITY_CONTRACT must contain valid JSON');
  }
  return parseObservabilityContract(parsed);
};

export const resolveObservabilityCredentials = (credentialVariable: string): UserAuthConfig => {
  const rawCredentials: unknown = Cypress.env(credentialVariable);
  if (!isRecord(rawCredentials)) {
    throw new Error(
      `Observability persona credential variable '${credentialVariable}' is not configured`,
    );
  }
  const username = rawCredentials.USERNAME;
  const password = rawCredentials.PASSWORD;
  const authType = rawCredentials.AUTH_TYPE;
  if (
    typeof username !== 'string' ||
    username.trim().length === 0 ||
    typeof password !== 'string' ||
    password.trim().length === 0 ||
    typeof authType !== 'string' ||
    authType.trim().length === 0
  ) {
    throw new Error(
      `Observability persona credential variable '${credentialVariable}' is incomplete`,
    );
  }
  return { USERNAME: username, PASSWORD: password, AUTH_TYPE: authType };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
