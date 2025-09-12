import React from 'react';
import { Form, Title, Stack, StackItem, Alert } from '@patternfly/react-core';
import { AccessReviewResourceAttributes, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useAccessReview } from '../../../../../../frontend/src/api';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import { TokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

type AdvancedSettingsStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  project: ProjectKind;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  wizardState,
  project,
}) => {
  const externalRouteData = wizardState.state.externalRoute.data;
  const tokenAuthData = wizardState.state.tokenAuthentication.data;

  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace: project.metadata.name,
  });

  return (
    <>
      <Title headingLevel="h2">Advanced Settings</Title>
      <Form>
        <Stack hasGutter>
          <StackItem>
            <ExternalRouteField
              isChecked={externalRouteData}
              allowCreate={allowCreate}
              onChange={wizardState.state.externalRoute.setData}
            />
          </StackItem>

          <StackItem>
            <TokenAuthenticationField
              tokens={tokenAuthData}
              allowCreate={allowCreate}
              onChange={wizardState.state.tokenAuthentication.setData}
            />
          </StackItem>

          {externalRouteData && (!tokenAuthData || tokenAuthData.length === 0) && (
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
