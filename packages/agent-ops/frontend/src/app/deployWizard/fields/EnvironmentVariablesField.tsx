import * as React from 'react';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
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
  envVarTypeOptions,
} from '~/app/deployWizard/wizardOptions';
import { ENV_VAR_FIELD_REQUIRED_ERROR, getEnvVarNameError } from '~/app/deployWizard/utils';
import './EnvironmentVariablesField.scss';

type EnvironmentVariablesFieldProps = {
  envVars: DeployAgentEnvVar[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, partial: Partial<DeployAgentEnvVar>) => void;
};

const parseEnvVarType = (key: string): DeployAgentEnvVarType | undefined => {
  switch (key) {
    case DeployAgentEnvVarType.DIRECT:
    case DeployAgentEnvVarType.SECRET:
    case DeployAgentEnvVarType.CONFIG_MAP:
      return key;
    default:
      return undefined;
  }
};

const clearEnvVarValueFields = (): Partial<DeployAgentEnvVar> => ({
  value: '',
  secretName: '',
  secretKey: '',
  configMapName: '',
  configMapKey: '',
});

const isEnvVarReferenceFieldInvalid = (envVar: DeployAgentEnvVar, fieldValue: string): boolean =>
  envVar.name.trim().length > 0 && fieldValue.trim().length === 0;

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
          const directValueInvalid = isEnvVarReferenceFieldInvalid(envVar, envVar.value);
          const secretNameInvalid = isEnvVarReferenceFieldInvalid(envVar, envVar.secretName);
          const secretKeyInvalid = isEnvVarReferenceFieldInvalid(envVar, envVar.secretKey);
          const configMapNameInvalid = isEnvVarReferenceFieldInvalid(envVar, envVar.configMapName);
          const configMapKeyInvalid = isEnvVarReferenceFieldInvalid(envVar, envVar.configMapKey);

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
                  onChange={(_event, value) => onUpdate(index, { name: value })}
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
                    options={envVarTypeOptions}
                    onChange={(key) => {
                      const type = parseEnvVarType(key);
                      if (type) {
                        onUpdate(index, { type, ...clearEnvVarValueFields() });
                      }
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
              {envVar.type === DeployAgentEnvVarType.DIRECT ? (
                <div className="agent-ops-env-var-row__field">
                  <TextInput
                    className="pf-v6-u-w-100"
                    id={`deploy-agent-env-var-value-${index}`}
                    data-testid={`deploy-agent-env-var-value-${index}`}
                    aria-label={`Environment variable value ${index + 1}`}
                    placeholder="Value"
                    value={envVar.value}
                    validated={
                      directValueInvalid ? ValidatedOptions.error : ValidatedOptions.default
                    }
                    aria-invalid={directValueInvalid}
                    aria-describedby={
                      directValueInvalid ? `deploy-agent-env-var-value-error-${index}` : undefined
                    }
                    onChange={(_event, value) => onUpdate(index, { value })}
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
              ) : null}
              {envVar.type === DeployAgentEnvVarType.SECRET ? (
                <>
                  <div className="agent-ops-env-var-row__field">
                    <TextInput
                      className="pf-v6-u-w-100"
                      id={`deploy-agent-env-var-secret-name-${index}`}
                      data-testid={`deploy-agent-env-var-secret-name-${index}`}
                      aria-label={`Secret name ${index + 1}`}
                      placeholder="Secret name"
                      value={envVar.secretName}
                      validated={
                        secretNameInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      aria-invalid={secretNameInvalid}
                      aria-describedby={
                        secretNameInvalid
                          ? `deploy-agent-env-var-secret-name-error-${index}`
                          : undefined
                      }
                      onChange={(_event, value) => onUpdate(index, { secretName: value })}
                    />
                    {secretNameInvalid ? (
                      <HelperText>
                        <HelperTextItem
                          id={`deploy-agent-env-var-secret-name-error-${index}`}
                          variant="error"
                        >
                          {ENV_VAR_FIELD_REQUIRED_ERROR}
                        </HelperTextItem>
                      </HelperText>
                    ) : null}
                  </div>
                  <div className="agent-ops-env-var-row__field">
                    <TextInput
                      className="pf-v6-u-w-100"
                      id={`deploy-agent-env-var-secret-key-${index}`}
                      data-testid={`deploy-agent-env-var-secret-key-${index}`}
                      aria-label={`Secret key ${index + 1}`}
                      placeholder="Secret key"
                      value={envVar.secretKey}
                      validated={
                        secretKeyInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      aria-invalid={secretKeyInvalid}
                      aria-describedby={
                        secretKeyInvalid
                          ? `deploy-agent-env-var-secret-key-error-${index}`
                          : undefined
                      }
                      onChange={(_event, value) => onUpdate(index, { secretKey: value })}
                    />
                    {secretKeyInvalid ? (
                      <HelperText>
                        <HelperTextItem
                          id={`deploy-agent-env-var-secret-key-error-${index}`}
                          variant="error"
                        >
                          {ENV_VAR_FIELD_REQUIRED_ERROR}
                        </HelperTextItem>
                      </HelperText>
                    ) : null}
                  </div>
                </>
              ) : null}
              {envVar.type === DeployAgentEnvVarType.CONFIG_MAP ? (
                <>
                  <div className="agent-ops-env-var-row__field">
                    <TextInput
                      className="pf-v6-u-w-100"
                      id={`deploy-agent-env-var-configmap-name-${index}`}
                      data-testid={`deploy-agent-env-var-configmap-name-${index}`}
                      aria-label={`ConfigMap name ${index + 1}`}
                      placeholder="ConfigMap name"
                      value={envVar.configMapName}
                      validated={
                        configMapNameInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      aria-invalid={configMapNameInvalid}
                      aria-describedby={
                        configMapNameInvalid
                          ? `deploy-agent-env-var-configmap-name-error-${index}`
                          : undefined
                      }
                      onChange={(_event, value) => onUpdate(index, { configMapName: value })}
                    />
                    {configMapNameInvalid ? (
                      <HelperText>
                        <HelperTextItem
                          id={`deploy-agent-env-var-configmap-name-error-${index}`}
                          variant="error"
                        >
                          {ENV_VAR_FIELD_REQUIRED_ERROR}
                        </HelperTextItem>
                      </HelperText>
                    ) : null}
                  </div>
                  <div className="agent-ops-env-var-row__field">
                    <TextInput
                      className="pf-v6-u-w-100"
                      id={`deploy-agent-env-var-configmap-key-${index}`}
                      data-testid={`deploy-agent-env-var-configmap-key-${index}`}
                      aria-label={`ConfigMap key ${index + 1}`}
                      placeholder="ConfigMap key"
                      value={envVar.configMapKey}
                      validated={
                        configMapKeyInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      aria-invalid={configMapKeyInvalid}
                      aria-describedby={
                        configMapKeyInvalid
                          ? `deploy-agent-env-var-configmap-key-error-${index}`
                          : undefined
                      }
                      onChange={(_event, value) => onUpdate(index, { configMapKey: value })}
                    />
                    {configMapKeyInvalid ? (
                      <HelperText>
                        <HelperTextItem
                          id={`deploy-agent-env-var-configmap-key-error-${index}`}
                          variant="error"
                        >
                          {ENV_VAR_FIELD_REQUIRED_ERROR}
                        </HelperTextItem>
                      </HelperText>
                    ) : null}
                  </div>
                </>
              ) : null}
              <div className="agent-ops-env-var-row__remove">
                <Button
                  aria-label={`Remove environment variable ${index + 1}`}
                  data-testid={`deploy-agent-remove-env-var-${index}`}
                  onClick={() => onRemove(index)}
                  variant="plain"
                  icon={<MinusCircleIcon />}
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
          Optional environment variables passed to the agent container at runtime. Do not enter
          secrets or credentials as direct values; use Secret reference instead.
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </>
);

export default EnvironmentVariablesField;
