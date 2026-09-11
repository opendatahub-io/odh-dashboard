export enum EnvironmentVariableType {
  Value = 'value',
  Secret = 'secret',
}

export const isEnvironmentVariableType = (key: string): key is EnvironmentVariableType =>
  key === EnvironmentVariableType.Value || key === EnvironmentVariableType.Secret;

export type ValueEnvironmentVariable = {
  type: EnvironmentVariableType.Value;
  name: string;
  value: string;
};

export type SecretEnvironmentVariable = {
  type: EnvironmentVariableType.Secret;
  name: string;
  secretName: string;
  secretKey: string;
  optional?: boolean;
};

export type EnvironmentVariable = ValueEnvironmentVariable | SecretEnvironmentVariable;

export const isSecretEnvVar = (
  envVar: Pick<EnvironmentVariable, 'type'> | EnvironmentVariable,
): envVar is SecretEnvironmentVariable => envVar.type === EnvironmentVariableType.Secret;

export const isValueEnvVar = (
  envVar: Pick<EnvironmentVariable, 'type'> | EnvironmentVariable,
): envVar is ValueEnvironmentVariable => envVar.type === EnvironmentVariableType.Value;

const SECRET_NAME_MAX_LENGTH = 253;
const SECRET_DATA_KEY_MAX_LENGTH = 253;

/** Secret metadata.name — DNS subdomain (RFC 1123), not a DNS label. */
const SECRET_NAME_REGEX = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;

/** Secret data key — matches k8s IsConfigMapKey / notebook env var key validation. */
const SECRET_DATA_KEY_REGEX = /^[-._a-zA-Z0-9]+$/;

export const SECRET_NAME_VALIDATION_ERROR =
  'Secret name must be a valid Kubernetes secret name (lowercase letters, numbers, hyphens, or dots; max 253 characters)';

export const SECRET_DATA_KEY_VALIDATION_ERROR =
  'Secret key must be a valid Kubernetes secret data key (letters, numbers, hyphens, underscores, or dots)';

export const isValidSecretName = (name: string): boolean =>
  name.length > 0 && name.length <= SECRET_NAME_MAX_LENGTH && SECRET_NAME_REGEX.test(name);

export const isValidSecretDataKey = (key: string): boolean =>
  key.length > 0 && key.length <= SECRET_DATA_KEY_MAX_LENGTH && SECRET_DATA_KEY_REGEX.test(key);

export type K8sSecretKeyRef = {
  name: string;
  key: string;
  optional?: boolean;
};

export type K8sEnvironmentVariableValueFrom = {
  secretKeyRef: K8sSecretKeyRef;
};

/** Env var as written to serving CRs (value or secretKeyRef, never both). */
export type K8sEnvironmentVariable =
  | { name: string; value: string }
  | {
      name: string;
      valueFrom: K8sEnvironmentVariableValueFrom;
    };

/** Env var as read from CRs (looser than write shape). */
export type K8sEnvironmentVariableInput = {
  name: string;
  value?: string | number;
  valueFrom?: K8sEnvironmentVariableValueFrom | Record<string, unknown>;
};

const isK8sEnvironmentVariableValueFrom = (
  valueFrom: K8sEnvironmentVariableValueFrom | Record<string, unknown>,
): valueFrom is K8sEnvironmentVariableValueFrom => {
  const { secretKeyRef } = valueFrom;
  return (
    secretKeyRef !== null &&
    typeof secretKeyRef === 'object' &&
    'name' in secretKeyRef &&
    'key' in secretKeyRef &&
    typeof secretKeyRef.name === 'string' &&
    typeof secretKeyRef.key === 'string'
  );
};

const getSecretKeyRef = (
  valueFrom: K8sEnvironmentVariableValueFrom | Record<string, unknown>,
): K8sSecretKeyRef | undefined => {
  if (!isK8sEnvironmentVariableValueFrom(valueFrom)) {
    return undefined;
  }

  const { secretKeyRef } = valueFrom;
  return {
    name: secretKeyRef.name,
    key: secretKeyRef.key,
    ...(secretKeyRef.optional ? { optional: true } : {}),
  };
};

export const createDefaultEnvironmentVariable = (): ValueEnvironmentVariable => ({
  type: EnvironmentVariableType.Value,
  name: '',
  value: '',
});

export const normalizeEnvironmentVariable = (
  envVar: Partial<EnvironmentVariable> & { name: string },
): EnvironmentVariable => {
  if (envVar.type === EnvironmentVariableType.Secret) {
    return {
      type: EnvironmentVariableType.Secret,
      name: envVar.name,
      secretName: envVar.secretName ?? '',
      secretKey: envVar.secretKey ?? '',
      ...(envVar.optional ? { optional: true } : {}),
    };
  }

  return {
    type: EnvironmentVariableType.Value,
    name: envVar.name,
    value: 'value' in envVar ? envVar.value ?? '' : '',
  };
};

export type EnvironmentVariableUpdates =
  | Partial<ValueEnvironmentVariable>
  | Partial<SecretEnvironmentVariable>
  | { type: EnvironmentVariableType };

export const mergeEnvironmentVariableUpdates = (
  currentVar: EnvironmentVariable,
  updates: EnvironmentVariableUpdates,
): EnvironmentVariable => {
  const nextType = updates.type ?? currentVar.type;

  if (isSecretEnvVar({ type: nextType })) {
    const base: SecretEnvironmentVariable = isSecretEnvVar(currentVar)
      ? currentVar
      : {
          type: EnvironmentVariableType.Secret,
          name: currentVar.name,
          secretName: '',
          secretKey: '',
        };

    return normalizeEnvironmentVariable({
      ...base,
      ...updates,
      type: EnvironmentVariableType.Secret,
    });
  }

  const base: ValueEnvironmentVariable = isValueEnvVar(currentVar)
    ? currentVar
    : {
        type: EnvironmentVariableType.Value,
        name: currentVar.name,
        value: '',
      };

  return normalizeEnvironmentVariable({
    ...base,
    ...updates,
    type: EnvironmentVariableType.Value,
  });
};

export const mapEnvironmentVariableToK8sEnv = (
  envVar: EnvironmentVariable,
): K8sEnvironmentVariable => {
  if (isSecretEnvVar(envVar)) {
    return {
      name: envVar.name,
      valueFrom: {
        secretKeyRef: {
          name: envVar.secretName,
          key: envVar.secretKey,
          ...(envVar.optional ? { optional: true } : {}),
        },
      },
    };
  }

  return {
    name: envVar.name,
    value: envVar.value,
  };
};

export const mapEnvironmentVariablesToK8sEnv = (
  variables: EnvironmentVariable[],
): K8sEnvironmentVariable[] => variables.map(mapEnvironmentVariableToK8sEnv);

export const mapK8sEnvToEnvironmentVariable = (
  envVar: K8sEnvironmentVariableInput,
): EnvironmentVariable => {
  if (envVar.valueFrom) {
    const secretKeyRef = getSecretKeyRef(envVar.valueFrom);
    if (secretKeyRef) {
      return {
        type: EnvironmentVariableType.Secret,
        name: envVar.name,
        secretName: secretKeyRef.name,
        secretKey: secretKeyRef.key,
        ...(secretKeyRef.optional ? { optional: true } : {}),
      };
    }
  }

  const value = envVar.value != null ? String(envVar.value) : '';

  return {
    type: EnvironmentVariableType.Value,
    name: envVar.name,
    value,
  };
};

export const formatEnvironmentVariableForReview = (envVar: EnvironmentVariable): string => {
  if (isSecretEnvVar(envVar)) {
    return `${envVar.name}, secret/${envVar.secretName}:${envVar.secretKey}`;
  }

  return `${envVar.name}, ${envVar.value}`;
};
