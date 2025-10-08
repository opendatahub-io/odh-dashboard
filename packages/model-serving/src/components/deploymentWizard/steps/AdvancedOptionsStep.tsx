import React from 'react';
import {
  AccessReviewResourceAttributes,
  K8sDSGResource,
  ProjectKind,
  ServingContainer,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import { isServingRuntimeKind } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { Form, Stack, StackItem, Alert, FormGroup, FormSection } from '@patternfly/react-core';
import { useAccessReview } from '@odh-dashboard/internal/api/index';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import { TokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { RuntimeArgsField } from '../fields/RuntimeArgsField';
import { EnvironmentVariablesField } from '../fields/EnvironmentVariablesField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { AvailableAiAssetsFieldsComponent } from '../fields/ModelAvailabilityFields';
import { showAuthWarning } from '../hooks/useAuthWarning';

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
  const { isExternalRouteVisible, shouldAutoCheckTokens } = wizardState.advancedOptions;

  // TODO: Clean up the stuff below related to KServe. Maybe move to an extension?
  const selectedModelServer = React.useMemo(() => {
    const templates = wizardState.state.modelFormatState.templatesFilteredForModelType;
    const modelServerData = wizardState.state.modelServer.data;
    if (!modelServerData || !templates || templates.length === 0) {
      return undefined;
    }
    const template = templates.find((tmpl) => tmpl.metadata.name === modelServerData.name);

    return template?.objects[0];
  }, [
    wizardState.state.modelFormatState.templatesFilteredForModelType,
    wizardState.state.modelServer.data,
  ]);

  const getKServeContainer = (
    servingRuntime?: ServingRuntimeKind,
  ): ServingContainer | undefined => {
    return (
      servingRuntime?.spec.containers.find((container) => container.name === 'kserve-container') ||
      servingRuntime?.spec.containers.find((container) => container.name === 'main')
    );
  };

  // will return `undefined` if no kserve container, force empty array if there is kserve with no args
  const getKServeContainerArgs = (servingRuntime?: K8sDSGResource): string[] | undefined => {
    const kserveContainer =
      servingRuntime && isServingRuntimeKind(servingRuntime)
        ? getKServeContainer(servingRuntime)
        : undefined;
    return kserveContainer ? kserveContainer.args ?? [] : undefined;
  };

  // will return `undefined` if no kserve container, force empty array if there is kserve with no vars
  const getKServeContainerEnvVarStrs = (servingRuntime?: K8sDSGResource): string[] | undefined => {
    const kserveContainer =
      servingRuntime && isServingRuntimeKind(servingRuntime)
        ? getKServeContainer(servingRuntime)
        : undefined;
    if (!kserveContainer) {
      return undefined;
    }
    return kserveContainer.env?.map((ev) => `${ev.name}=${ev.value ?? ''}`) || [];
  };

  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace: project.metadata.name,
  });

  const handleExternalRouteChange = (checked: boolean) => {
    wizardState.state.externalRoute.setData(checked);

    // When external route is enabled, automatically enable token authentication for security
    if (checked && (!tokenAuthData || tokenAuthData.length === 0)) {
      const defaultToken = {
        uuid: `ml-${Date.now()}`,
        displayName: 'default-token',
        error: '',
      };
      wizardState.state.tokenAuthentication.setData([defaultToken]);
    }
  };

  return (
    <>
      <Form>
        <FormSection title="Advanced settings">
          <Stack hasGutter>
            {wizardState.state.modelAvailability.showField && (
              <StackItem>
                <FormGroup
                  label="Model playground availability"
                  data-testid="Model-playground-availability-section"
                  fieldId="Model playground availability"
                >
                  <AvailableAiAssetsFieldsComponent
                    data={wizardState.state.modelAvailability.data}
                    setData={wizardState.state.modelAvailability.setData}
                    showSaveAsMaaS={wizardState.state.modelAvailability.showSaveAsMaaS}
                  />
                </FormGroup>
              </StackItem>
            )}
            {isExternalRouteVisible && (
              <StackItem>
                <FormGroup
                  label="Model access"
                  data-testid="external-route-section"
                  fieldId="model-access"
                >
                  <ExternalRouteField
                    isChecked={externalRouteData}
                    allowCreate={allowCreate}
                    onChange={handleExternalRouteChange}
                  />
                </FormGroup>
              </StackItem>
            )}
            <StackItem>
              <FormGroup
                label="Token authentication"
                data-testid="auth-section"
                fieldId="alt-form-checkbox-auth"
              >
                <TokenAuthenticationField
                  tokens={tokenAuthData}
                  allowCreate={allowCreate}
                  onChange={wizardState.state.tokenAuthentication.setData}
                />
              </FormGroup>
            </StackItem>

            {showAuthWarning({
              shouldAutoCheckTokens,
              isExternalRouteVisible,
              externalRouteData,
              tokenAuthData,
            }) && (
              <StackItem>
                <Alert
                  id="no-auth-alert"
                  data-testid="no-auth-alert"
                  variant="warning"
                  isInline
                  title="Making models available by external routes without requiring authorization can lead to security vulnerabilities."
                />
              </StackItem>
            )}

            <StackItem>
              <FormGroup
                label="Configuration parameters"
                data-testid="configuration-params"
                fieldId="configuration-params"
              >
                <Stack hasGutter>
                  <StackItem>
                    <RuntimeArgsField
                      data={wizardState.state.runtimeArgs.data}
                      onChange={wizardState.state.runtimeArgs.setData}
                      allowCreate={allowCreate}
                      predefinedArgs={getKServeContainerArgs(selectedModelServer)}
                    />
                  </StackItem>
                  <StackItem>
                    <EnvironmentVariablesField
                      data={wizardState.state.environmentVariables.data}
                      onChange={wizardState.state.environmentVariables.setData}
                      allowCreate={allowCreate}
                      predefinedVars={getKServeContainerEnvVarStrs(selectedModelServer)}
                    />
                  </StackItem>
                </Stack>
              </FormGroup>
            </StackItem>
          </Stack>
        </FormSection>
      </Form>
    </>
  );
};
