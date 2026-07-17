import * as React from 'react';
import { Button, Divider, HelperText, HelperTextItem } from '@patternfly/react-core';
import { InfoCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { ConfigMapCategory, EnvVariable, SecretCategory } from '#~/pages/projects/types';
import EnvTypeSelectField from './EnvTypeSelectField';

type EnvironmentVariablesProps = {
  envVariables: EnvVariable[];
  setEnvVariables: (envVars: EnvVariable[]) => void;
  namespace: string;
};
const EnvironmentVariables: React.FC<EnvironmentVariablesProps> = ({
  envVariables,
  setEnvVariables,
  namespace,
}) => {
  const getUsedSecretNames = (excludeIndex: number): Set<string> => {
    const used = new Set<string>();
    envVariables.forEach((v, idx) => {
      if (idx !== excludeIndex && v.values?.category === SecretCategory.EXISTING) {
        v.existingSecretRefs?.forEach((ref) => used.add(ref.secretName));
      }
    });
    return used;
  };

  const getInlineKeyNames = (excludeIndex: number): Set<string> => {
    const keys = new Set<string>();
    envVariables.forEach((v, idx) => {
      if (idx === excludeIndex) {
        return;
      }
      const cat = v.values?.category;
      if (
        cat === SecretCategory.GENERIC ||
        cat === SecretCategory.UPLOAD ||
        cat === ConfigMapCategory.GENERIC ||
        cat === ConfigMapCategory.UPLOAD
      ) {
        v.values?.data.forEach((entry) => {
          if (entry.key) {
            keys.add(entry.key);
          }
        });
      }
      if (cat === SecretCategory.EXISTING) {
        v.existingSecretRefs?.forEach((ref) => {
          ref.selectedKeys.forEach((k) => keys.add(k));
        });
      }
    });
    return keys;
  };

  return (
    <>
      {envVariables.map((envVariable, i) => (
        <React.Fragment key={i}>
          <EnvTypeSelectField
            envVariable={envVariable}
            onUpdate={(updatedVariable) => {
              setEnvVariables(
                envVariables.map((currentEnvVariable, mapIndex) =>
                  mapIndex === i ? updatedVariable : currentEnvVariable,
                ),
              );
            }}
            onRemove={() =>
              setEnvVariables(envVariables.filter((v, filterIndex) => filterIndex !== i))
            }
            namespace={namespace}
            usedSecretNames={getUsedSecretNames(i)}
            inlineKeyNames={getInlineKeyNames(i)}
          />
          {i !== envVariables.length - 1 && <Divider />}
        </React.Fragment>
      ))}
      {envVariables.length > 0 ? (
        <HelperText data-testid="env-rotation-hint">
          <HelperTextItem variant="indeterminate" icon={<InfoCircleIcon />}>
            Environment variables are set at workbench start. If secret values change (e.g.,
            credential rotation), restart the workbench to pick up new values.
          </HelperTextItem>
        </HelperText>
      ) : null}
      <Button
        variant="link"
        data-testid="add-variable-button"
        isInline
        icon={<PlusCircleIcon />}
        iconPosition="left"
        onClick={() => setEnvVariables([...envVariables, { type: null }])}
      >
        {envVariables.length === 0 ? 'Add variable' : 'Add more variables'}
      </Button>
    </>
  );
};

export default EnvironmentVariables;
