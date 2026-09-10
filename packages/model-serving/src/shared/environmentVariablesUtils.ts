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
};

export type EnvironmentVariable = ValueEnvironmentVariable | SecretEnvironmentVariable;

/** Env var as written to serving CRs (value or secretKeyRef, never both). */
export type K8sEnvironmentVariable =
  | { name: string; value: string }
  | {
      name: string;
      valueFrom: {
        secretKeyRef: {
          name: string;
          key: string;
        };
      };
    };

/** Env var as read from CRs (looser than write shape). */
export type K8sEnvironmentVariableInput = {
  name: string;
  value?: string | number;
  valueFrom?: Record<string, unknown>;
};

const getSecretKeyRef = (
  valueFrom: Record<string, unknown>,
): { name: string; key: string } | undefined => {
  const { secretKeyRef } = valueFrom;
  if (
    secretKeyRef &&
    typeof secretKeyRef === 'object' &&
    'name' in secretKeyRef &&
    'key' in secretKeyRef &&
    typeof secretKeyRef.name === 'string' &&
    typeof secretKeyRef.key === 'string'
  ) {
    return { name: secretKeyRef.name, key: secretKeyRef.key };
  }
  return undefined;
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
    };
  }

  return {
    type: EnvironmentVariableType.Value,
    name: envVar.name,
    value: 'value' in envVar ? envVar.value ?? '' : '',
  };
};

export const mapEnvironmentVariableToK8sEnv = (
  envVar: EnvironmentVariable,
): K8sEnvironmentVariable => {
  if (envVar.type === EnvironmentVariableType.Secret) {
    return {
      name: envVar.name,
      valueFrom: {
        secretKeyRef: {
          name: envVar.secretName,
          key: envVar.secretKey,
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
  if (envVar.type === EnvironmentVariableType.Secret) {
    return `${envVar.name}, secret/${envVar.secretName}:${envVar.secretKey}`;
  }

  return `${envVar.name}, ${envVar.value}`;
};
