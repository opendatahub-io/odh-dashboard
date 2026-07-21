import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { asEnumMember } from '@odh-dashboard/foundation';
import {
  EnvironmentVariableType,
  EnvVariableData,
  ExistingSecretRef,
  SecretCategory,
} from '#~/pages/projects/types';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import EnvExistingSecretField from './EnvExistingSecretField';
import { useCanListSecrets } from './useCanListSecrets';

type EnvSecretProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
  namespace: string;
  existingSecretRefs?: ExistingSecretRef[];
  onExistingSecretRefsUpdate?: (refs: ExistingSecretRef[]) => void;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvSecret: React.FC<EnvSecretProps> = ({
  env = DEFAULT_ENV,
  onUpdate,
  namespace,
  existingSecretRefs = [],
  onExistingSecretRefsUpdate,
  usedSecretNames,
  inlineKeyNames,
}) => {
  const { canList, loaded: rbacLoaded } = useCanListSecrets(namespace);
  const existingDisabled = rbacLoaded && !canList;

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
          labelIcon: existingDisabled ? (
            <Popover
              headerContent="Access permissions needed"
              bodyContent="To list existing secrets, ask your administrator to grant 'secrets list' access for this project, or use the Key / value option to create a new secret."
            >
              <OutlinedQuestionCircleIcon aria-label="More info" />
            </Popover>
          ) : undefined,
          render: (
            <EnvExistingSecretField
              namespace={namespace}
              existingSecretRefs={existingSecretRefs}
              onUpdate={(refs) => onExistingSecretRefsUpdate?.(refs)}
              usedSecretNames={usedSecretNames}
              inlineKeyNames={inlineKeyNames}
            />
          ),
        },
      }}
    />
  );
};

export default EnvSecret;
