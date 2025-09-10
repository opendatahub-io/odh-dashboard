import React from 'react';
import { Form, Title, Stack, StackItem, Alert } from '@patternfly/react-core';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import {
  TokenAuthenticationField,
  type TokenAuthenticationFieldData,
} from '../fields/TokenAuthenticationField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

type AdvancedSettingsStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  tokenAuthAlert?: boolean;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  wizardState,
  tokenAuthAlert = false,
}) => {
  const externalRouteData = wizardState.state.externalRoute.data || { externalRoute: false };
  const tokenAuthData = wizardState.state.tokenAuthentication.data || {
    tokenAuth: false,
    tokens: [],
  };

  const handleExternalRouteChange = (checked: boolean) => {
    wizardState.state.externalRoute.updateField(checked);

    // If enabling external route, also enable token auth and create a token if none exist
    if (checked) {
      wizardState.state.tokenAuthentication.updateField('tokenAuth', true);
      if (tokenAuthData.tokens.length === 0) {
        wizardState.state.tokenAuthentication.updateField('tokens', [
          {
            name: 'default-name',
            uuid: `ml-${Date.now()}`,
            error: '',
          },
        ]);
      }
    }
  };

  const handleTokenAuthChange = (
    key: keyof TokenAuthenticationFieldData,
    value: TokenAuthenticationFieldData[keyof TokenAuthenticationFieldData],
  ) => {
    wizardState.state.tokenAuthentication.updateField(key, value);
  };

  return (
    <>
      <Title headingLevel="h2">Advanced Settings</Title>
      <Form>
        <Stack hasGutter>
          <StackItem>
            <ExternalRouteField
              data={externalRouteData}
              onChange={handleExternalRouteChange}
              allowCreate
              tokenAuthAlert={tokenAuthAlert}
            />
          </StackItem>

          <StackItem>
            <TokenAuthenticationField
              data={tokenAuthData}
              onChange={handleTokenAuthChange}
              allowCreate
            />
          </StackItem>

          {externalRouteData.externalRoute && !tokenAuthData.tokenAuth && (
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
      </Form>
    </>
  );
};
