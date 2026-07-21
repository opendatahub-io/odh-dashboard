import * as React from 'react';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import type { DeployAgentEnvVar } from '~/app/deployWizard/types';
import { DeployAgentEnvVarType } from '~/app/deployWizard/types';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  supportedEnvVarTypeOptions,
} from '~/app/deployWizard/wizardOptions';
import { ENV_VAR_FIELD_REQUIRED_ERROR, getEnvVarNameError } from '~/app/deployWizard/utils';
import './EnvironmentVariablesField.scss';

type EnvironmentVariablesFieldProps = {
  envVars: DeployAgentEnvVar[];
  onAdd: () => void;
  onRemove: (rowId: string) => void;
  onUpdate: (rowId: string, partial: Partial<DeployAgentEnvVar>) => void;
};

const isEnvVarValueInvalid = (envVar: DeployAgentEnvVar): boolean =>
  envVar.name.trim().length > 0 && envVar.value.trim().length === 0;

const EnvironmentVariablesField: React.FC<EnvironmentVariablesFieldProps> = ({
  envVars,
  onAdd,
  onRemove,
  onUpdate,
}) => (
  <>
    {envVars.length > 0 ? (
      <Stack hasGutter={false}>
        {envVars.map((envVar, index) => {
          const nameError = getEnvVarNameError(envVar.name);
          const nameInvalid = nameError.length > 0;
          const directValueInvalid = isEnvVarValueInvalid(envVar);

          return (
            <StackItem
              key={envVar.rowId}
              className="agent-ops-env-var-row"
              id={`deploy-agent-env-var-row-${index}`}
            >
              <div className="agent-ops-env-var-row__field agent-ops-env-var-row__field--name">
                <TextInput
                  className="pf-v6-u-w-100"
                  id={`deploy-agent-env-var-name-${index}`}
                  data-testid={`deploy-agent-env-var-name-${index}`}
                  aria-label={`Environment variable name ${index + 1}`}
                  placeholder="Name"
                  value={envVar.name}
                  validated={nameInvalid ? ValidatedOptions.error : ValidatedOptions.default}
                  aria-invalid={nameInvalid}
                  aria-describedby={
                    nameError ? `deploy-agent-env-var-name-error-${index}` : undefined
                  }
                  onChange={(_event, value) => onUpdate(envVar.rowId, { name: value })}
                />
                {nameError ? (
                  <HelperText>
                    <HelperTextItem id={`deploy-agent-env-var-name-error-${index}`} variant="error">
                      {nameError}
                    </HelperTextItem>
                  </HelperText>
                ) : null}
              </div>
              <div className="agent-ops-env-var-row__field agent-ops-env-var-row__field--type">
                <DeployWizardSelectField>
                  <SimpleSelect
                    dataTestId={`deploy-agent-env-var-type-${index}`}
                    placeholder="Direct value"
                    value={envVar.type}
                    options={supportedEnvVarTypeOptions}
                    onChange={() => {
                      onUpdate(envVar.rowId, { type: DeployAgentEnvVarType.DIRECT });
                    }}
                    isFullWidth
                    maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
                    popperProps={{ appendTo: 'inline' }}
                    toggleProps={{
                      id: `deploy-agent-env-var-type-${index}`,
                      'aria-label': `Environment variable value type ${index + 1}`,
                    }}
                  />
                </DeployWizardSelectField>
              </div>
              <div className="agent-ops-env-var-row__field">
                <TextInput
                  className="pf-v6-u-w-100"
                  id={`deploy-agent-env-var-value-${index}`}
                  data-testid={`deploy-agent-env-var-value-${index}`}
                  aria-label={`Environment variable value ${index + 1}`}
                  placeholder="Value"
                  value={envVar.value}
                  validated={directValueInvalid ? ValidatedOptions.error : ValidatedOptions.default}
                  aria-invalid={directValueInvalid}
                  aria-describedby={
                    directValueInvalid ? `deploy-agent-env-var-value-error-${index}` : undefined
                  }
                  onChange={(_event, value) => onUpdate(envVar.rowId, { value })}
                />
                {directValueInvalid ? (
                  <HelperText>
                    <HelperTextItem
                      id={`deploy-agent-env-var-value-error-${index}`}
                      variant="error"
                    >
                      {ENV_VAR_FIELD_REQUIRED_ERROR}
                    </HelperTextItem>
                  </HelperText>
                ) : null}
              </div>
              <div className="agent-ops-env-var-row__remove">
                <Button
                  aria-label={`Remove environment variable ${index + 1}`}
                  data-testid={`deploy-agent-remove-env-var-${index}`}
                  onClick={() => onRemove(envVar.rowId)}
                  variant="plain"
                  icon={
                    <Icon status="danger">
                      <MinusCircleIcon />
                    </Icon>
                  }
                />
              </div>
            </StackItem>
          );
        })}
      </Stack>
    ) : null}
    <Button
      isInline
      data-testid="deploy-agent-add-env-var"
      variant="link"
      onClick={onAdd}
      icon={<PlusCircleIcon />}
    >
      Add variable
    </Button>
    <FormHelperText>
      <HelperText>
        <HelperTextItem>
          Optional environment variables passed to the agent container at runtime. Only direct
          values are supported for deployment today.
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </>
);

export default EnvironmentVariablesField;
