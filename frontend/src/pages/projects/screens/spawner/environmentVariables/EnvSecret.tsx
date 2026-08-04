import * as React from 'react';
import { Content, ContentVariants, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { asEnumMember } from '@odh-dashboard/foundation';
import {
  EnvironmentVariableType,
  EnvVariableData,
  ExistingSecretRef,
  SecretCategory,
} from '#~/pages/projects/types';
import { UseExistingSecretsResult } from './useExistingSecrets';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import EnvExistingSecretField from './EnvExistingSecretField';

type EnvSecretProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
  existingSecretRefs?: ExistingSecretRef[];
  onExistingSecretRefsUpdate?: (refs: ExistingSecretRef[]) => void;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
  existingSecretsData: UseExistingSecretsResult;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EXISTING_SECRET_DISABLED_MESSAGES = {
  noPermission: "You don't have permission to view secrets.",
  noSecrets: 'No secrets available to attach.',
} as const;

const EnvSecret: React.FC<EnvSecretProps> = ({
  env = DEFAULT_ENV,
  onUpdate,
  existingSecretRefs = [],
  onExistingSecretRefsUpdate,
  usedSecretNames,
  inlineKeyNames,
  existingSecretsData,
}) => {
  const { secrets, loaded, canList, error } = existingSecretsData;
  const noPermission = loaded && !canList;
  const loadFailed = loaded && canList && !!error;
  const noSecrets = loaded && canList && !error && secrets.length === 0;
  const existingDisabled = !loaded || noPermission || loadFailed || noSecrets;

  const disabledMessage = !loaded
    ? 'Loading secrets...'
    : loadFailed
    ? 'Unable to load secrets. Retry or contact your administrator.'
    : noPermission
    ? EXISTING_SECRET_DISABLED_MESSAGES.noPermission
    : noSecrets
    ? EXISTING_SECRET_DISABLED_MESSAGES.noSecrets
    : undefined;

  return (
    <EnvDataTypeField
      selection={env.category || ''}
      onSelection={(value) =>
        onUpdate({ ...env, category: asEnumMember(value, SecretCategory), data: [] })
      }
      radioGroupName="env-secret-subtype"
      options={{
        [SecretCategory.GENERIC]: {
          label: 'Key / value',
          description: 'Create a new key-value pair for this environment variable',
          render: (
            <GenericKeyValuePairField
              values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
              onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
              valueIsSecret
            />
          ),
        },
        [SecretCategory.UPLOAD]: {
          label: 'Upload',
          description: 'Upload environment variables from a file',
          render: (
            <EnvUploadField
              envVarType={EnvironmentVariableType.SECRET}
              onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
              translateValue={(value) => atob(value)}
            />
          ),
        },
        [SecretCategory.EXISTING]: {
          label: 'Existing secret',
          description:
            'Attach an available secret from this project. Use Existing Secrets to attach secrets managed by your platform team or provisioned through external tools. For reusable credentials like S3 or database connections, use the Connections section.',
          isDisabled: existingDisabled,
          labelIcon: disabledMessage ? (
            <Tooltip content={disabledMessage}>
              <OutlinedQuestionCircleIcon aria-label="More info" />
            </Tooltip>
          ) : undefined,
          render: disabledMessage ? (
            <Content component={ContentVariants.small}>{disabledMessage}</Content>
          ) : (
            <EnvExistingSecretField
              existingSecretRefs={existingSecretRefs}
              onUpdate={(refs) => onExistingSecretRefsUpdate?.(refs)}
              usedSecretNames={usedSecretNames}
              inlineKeyNames={inlineKeyNames}
              existingSecretsData={existingSecretsData}
            />
          ),
        },
      }}
    />
  );
};

export default EnvSecret;
