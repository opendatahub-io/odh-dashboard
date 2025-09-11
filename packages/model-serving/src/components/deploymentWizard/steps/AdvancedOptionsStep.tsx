import React from 'react';
import { Form, Title, Stack, StackItem, Alert } from '@patternfly/react-core';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import { TokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

type AdvancedSettingsStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  tokenAuthAlert?: boolean;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  wizardState,
  tokenAuthAlert = false,
}) => {
  const externalRouteData = wizardState.state.externalRoute.data;
  const tokenAuthData = wizardState.state.tokenAuthentication.data;

  return (
    <>
      <Title headingLevel="h2">Advanced Settings</Title>
      <Form>
        <Stack hasGutter>
          <StackItem>
            <ExternalRouteField
              data={externalRouteData}
              allowCreate
              tokenAuthAlert={tokenAuthAlert}
            />
          </StackItem>

          <StackItem>
            <TokenAuthenticationField data={tokenAuthData} allowCreate />
          </StackItem>

          {externalRouteData?.externalRoute && (
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
