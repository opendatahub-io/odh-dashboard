import React from 'react';
import {
  FormGroup,
  Checkbox,
  Title,
  Alert,
  Stack,
  StackItem,
  getUniqueId,
} from '@patternfly/react-core';
import { z } from 'zod';
import TokenAuthenticationSection from './TokenAuthenticationSection';

// Schema

const servingRuntimeTokenSchema = z.object({
  uuid: z.string(),
  name: z.string().min(1, 'Service account name is required'),
  error: z.string().optional(),
});

export const advancedSettingsFieldSchema = z.object({
  externalRoute: z.boolean(),
  tokenAuth: z.boolean(),
  tokens: z.array(servingRuntimeTokenSchema),
});

export type AdvancedSettingsFieldData = z.infer<typeof advancedSettingsFieldSchema>;

export const isValidAdvancedSettings = (value: unknown): value is AdvancedSettingsFieldData => {
  return advancedSettingsFieldSchema.safeParse(value).success;
};

// Hooks

export type AdvancedSettingsField = {
  data: AdvancedSettingsFieldData | undefined;
  setData: (data: AdvancedSettingsFieldData) => void;
  updateField: (
    key: keyof AdvancedSettingsFieldData,
    value: AdvancedSettingsFieldData[keyof AdvancedSettingsFieldData],
  ) => void;
};

export const useAdvancedSettingsField = (
  existingData?: AdvancedSettingsFieldData,
): AdvancedSettingsField => {
  const [advancedSettings, setAdvancedSettings] = React.useState<
    AdvancedSettingsFieldData | undefined
  >(existingData || { externalRoute: false, tokenAuth: false, tokens: [] });

  const updateField = React.useCallback(
    (
      key: keyof AdvancedSettingsFieldData,
      value: AdvancedSettingsFieldData[keyof AdvancedSettingsFieldData],
    ) => {
      setAdvancedSettings((prev) => {
        const current = prev || { externalRoute: false, tokenAuth: false, tokens: [] };
        return {
          ...current,
          [key]: value,
        };
      });
    },
    [],
  );

  return {
    data: advancedSettings,
    setData: setAdvancedSettings,
    updateField,
  };
};

// Component

type AdvancedOptionsSectionProps = {
  data?: AdvancedSettingsFieldData;
  setData?: (
    key: keyof AdvancedSettingsFieldData,
    value: AdvancedSettingsFieldData[keyof AdvancedSettingsFieldData],
  ) => void;
  allowCreate?: boolean;
  tokenAuthAlert?: boolean;
};

export const AdvancedOptionsSection: React.FC<AdvancedOptionsSectionProps> = ({
  data = { externalRoute: false, tokenAuth: false, tokens: [] },
  setData,
  allowCreate = true,
  tokenAuthAlert = false,
}) => {
  const createNewToken = React.useCallback(() => {
    const name = 'default-name';
    const duplicated = data.tokens.filter((token) => token.name === name);
    const duplicatedError = duplicated.length > 0 ? 'Duplicates are invalid' : '';
    setData?.('tokens', [
      ...data.tokens,
      {
        name,
        uuid: getUniqueId('ml'),
        error: duplicatedError,
      },
    ]);
  }, [data.tokens, setData]);

  return (
    <>
      <Title headingLevel="h2">Advanced Settings</Title>
      <Stack hasGutter>
        <StackItem>
          <FormGroup fieldId="model-access" label="Model access">
            <Checkbox
              id="alt-form-checkbox-route"
              data-testid="model-access-checkbox"
              label="Make model deployment available through an external route"
              isChecked={data.externalRoute}
              isDisabled={!allowCreate}
              onChange={(e, check) => {
                setData?.('externalRoute', check);
                if (check && allowCreate) {
                  setData?.('tokenAuth', check);
                  if (data.tokens.length === 0) {
                    createNewToken();
                  }
                }
              }}
            />
          </FormGroup>
        </StackItem>

        <StackItem>
          <TokenAuthenticationSection
            data={{ tokenAuth: data.tokenAuth, tokens: data.tokens }}
            setData={setData}
            allowCreate={allowCreate}
            createNewToken={createNewToken}
          />
        </StackItem>

        {data.externalRoute && tokenAuthAlert && (
          <StackItem>
            <Alert
              isInline
              variant="warning"
              title="Token authentication prerequisite not installed"
              data-testid="token-authentication-prerequisite-alert"
            >
              <p>
                Making models available through external routes without requiring token
                authentication authentication authentication can lead to unauthorized access of your
                model. To enable token authentication, you must first request that your cluster
                administrator Authorino operator on your cluster.
              </p>
            </Alert>
          </StackItem>
        )}

        {data.externalRoute && !data.tokenAuth && (
          <StackItem>
            <Alert
              id="external-route-no-token-alert"
              data-testid="external-route-no-token-alert"
              variant="warning"
              isInline
              title="Making models available by external routes without requiring authorization can lead to security vulnerabilities."
            />
          </StackItem>
        )}
      </Stack>
    </>
  );
};
