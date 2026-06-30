import * as React from 'react';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import type { DeployAgentEnvVar } from '~/app/deployWizard/types';
import { getEnvVarNameError } from '~/app/deployWizard/utils';

type EnvironmentVariablesFieldProps = {
  envVars: DeployAgentEnvVar[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, partial: Partial<DeployAgentEnvVar>) => void;
};

const EnvironmentVariablesField: React.FC<EnvironmentVariablesFieldProps> = ({
  envVars,
  onAdd,
  onRemove,
  onUpdate,
}) => (
  <>
    {envVars.map((envVar, index) => {
      const nameError = getEnvVarNameError(envVar.name);

      return (
        <Split hasGutter key={`env-var-${index}`}>
          <SplitItem isFilled>
            <TextInput
              data-testid={`deploy-agent-env-var-name-${index}`}
              aria-label="Environment variable name"
              value={envVar.name}
              validated={nameError ? ValidatedOptions.error : ValidatedOptions.default}
              onChange={(_event, value) => onUpdate(index, { name: value })}
            />
            {nameError && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{nameError}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </SplitItem>
          <SplitItem isFilled>
            <TextInput
              data-testid={`deploy-agent-env-var-value-${index}`}
              aria-label="Environment variable value"
              value={envVar.value}
              onChange={(_event, value) => onUpdate(index, { value })}
            />
          </SplitItem>
          <SplitItem>
            <Button
              aria-label={`Remove environment variable ${index + 1}`}
              data-testid={`deploy-agent-remove-env-var-${index}`}
              onClick={() => onRemove(index)}
              variant="plain"
              icon={<MinusCircleIcon />}
            />
          </SplitItem>
        </Split>
      );
    })}
    <Button
      isInline
      data-testid="deploy-agent-add-env-var"
      variant="link"
      onClick={onAdd}
      icon={<PlusCircleIcon />}
    >
      Add variable
    </Button>
  </>
);

export default EnvironmentVariablesField;
