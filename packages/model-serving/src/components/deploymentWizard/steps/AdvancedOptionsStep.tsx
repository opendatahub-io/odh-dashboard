import React from 'react';
import type { K8sDSGResource, AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import {
  Form,
  Stack,
  StackItem,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Spinner,
  Alert,
} from '@patternfly/react-core';
import {
  ServingContainer,
  ServingRuntimeKind,
  isServingRuntimeKind,
  isTemplateKind,
} from '@odh-dashboard/model-serving/shared';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import { TokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { RuntimeArgsField } from '../fields/RuntimeArgsField';
import { EnvironmentVariablesField } from '../fields/EnvironmentVariablesField';
import { DeploymentStrategyField } from '../fields/DeploymentStrategyField';
import { GenericFieldRenderer } from '../fields/GenericFieldRenderer';
import { type UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { GenAiStudioAvailabilityFields } from '../fields/ModelAvailabilityFields';
import type { ExternalDataMap } from '../ExternalDataLoader';

export const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

type AdvancedSettingsStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  externalData: ExternalDataMap;
  allowCreate: boolean;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  wizardState,
  externalData,
  allowCreate,
}) => {
  const externalRouteData = wizardState.state.externalRoute.data;
  const tokenAuthData = wizardState.state.tokenAuthentication.data;
  const { isExternalRouteVisible, shouldAutoCheckTokens } = wizardState.advancedOptions;

  // TODO: Clean up the stuff below related to KServe. Maybe move to an extension?
  const selectedModelServer = React.useMemo(() => {
    const selection = wizardState.state.modelServer?.data?.selection;
    if (!selection) {
      return undefined;
    }

    // Prefer Template attached to the shared model-server selection; fall back to
    // modelFormatState (existing tech debt) for predictive flows before hydration.
    const templateFromSelection =
      selection.template && isTemplateKind(selection.template) ? selection.template : undefined;
    const template =
      templateFromSelection ??
      wizardState.state.modelFormatState.templatesFilteredForModelType?.find(
        (tmpl) => tmpl.metadata.name === selection.name,
      );

    return template?.objects[0];
  }, [
    wizardState.state.modelFormatState.templatesFilteredForModelType,
    wizardState.state.modelServer?.data,
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

  const { isGenAiEnabled } = wizardState.state.modelAvailability;
  const hasUserExtensionFields = React.useMemo(
    () => wizardState.fields.some((f) => f.parentId === 'model-users'),
    [wizardState.fields],
  );
  const showAvailabilitySection = wizardState.state.modelAvailability.showField && isGenAiEnabled;

  if (!wizardState.loaded.advancedOptionsLoaded) {
    return <Spinner data-testid="spinner" />;
  }

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
            {hasUserExtensionFields && (
              <StackItem>
                <FormGroup label="Users" data-testid="model-users" fieldId="model-users">
                  <FormHelperText className="pf-v6-u-mb-md">
                    <HelperText>
                      <HelperTextItem>
                        Select which users can discover this endpoint within OpenShift AI.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <GenericFieldRenderer
                    parentId="model-users"
                    wizardState={wizardState}
                    externalData={externalData}
                  />
                </FormGroup>
              </StackItem>
            )}
            {showAvailabilitySection && (
              <StackItem>
                <FormGroup
                  label="Availability"
                  data-testid="model-availability"
                  fieldId="model-availability"
                >
                  <FormHelperText className="pf-v6-u-mb-md">
                    <HelperText>
                      <HelperTextItem>
                        Select where users can access endpoint details.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <GenAiStudioAvailabilityFields
                    data={wizardState.state.modelAvailability.data}
                    setData={wizardState.state.modelAvailability.setData}
                    isDisabled={wizardState.state.modelAvailability.isDisabled}
                    showUseCase={!wizardState.state.modelAvailability.isMaaSSubscriptionSelected}
                  />
                  {wizardState.state.modelAvailability.isMaaSSubscriptionSelected && (
                    <Alert
                      className="pf-v6-u-mt-md"
                      variant="info"
                      title="Additional configuration required"
                      data-testid="maas-additional-configuration-alert"
                      isInline
                    >
                      To make the endpoint accessible to users, an admin must configure
                      subscriptions and authorization policies on the{' '}
                      <strong>MaaS governance</strong> page. Users can view their subscriptions,
                      accessible models, and API keys on the <strong>API keys</strong> page.
                    </Alert>
                  )}
                </FormGroup>
              </StackItem>
            )}
            <GenericFieldRenderer
              wizardState={wizardState}
              externalData={externalData}
              parentId="networking"
            />
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
                  allowCreate={allowCreate && !wizardState.state.tokenAuthentication.isDisabled}
                  onChange={wizardState.state.tokenAuthentication.setData}
                  shouldAutoCheck={shouldAutoCheckTokens}
                  isExternalRouteVisible={isExternalRouteVisible}
                  externalRouteData={externalRouteData}
                  disabledHelperText={wizardState.state.tokenAuthentication.disabledHelperText}
                />
              </FormGroup>
            </StackItem>

            <GenericFieldRenderer
              fieldId="modelCapabilities"
              wizardState={wizardState}
              externalData={externalData}
            />

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
                      predefinedArgs={getKServeContainerArgs(selectedModelServer)}
                    />
                  </StackItem>
                  <StackItem>
                    <EnvironmentVariablesField
                      data={wizardState.state.environmentVariables.data}
                      onChange={wizardState.state.environmentVariables.setData}
                      predefinedVars={getKServeContainerEnvVarStrs(selectedModelServer)}
                      allowCreate={allowCreate}
                    />
                  </StackItem>
                </Stack>
              </FormGroup>
            </StackItem>
            {wizardState.state.deploymentStrategy.isVisible && (
              <StackItem>
                <FormGroup
                  label="Deployment strategy"
                  data-testid="deployment-strategy-section"
                  fieldId="deployment-strategy"
                >
                  <DeploymentStrategyField
                    value={wizardState.state.deploymentStrategy.data}
                    onChange={wizardState.state.deploymentStrategy.setData}
                  />
                </FormGroup>
              </StackItem>
            )}
            {/* Timeout field rendered via extension system */}
            <GenericFieldRenderer
              fieldId="kserve/timeout"
              wizardState={wizardState}
              externalData={externalData}
              isEditing={wizardState.initialData?.isEditing}
            />
          </Stack>
        </FormSection>
      </Form>
    </>
  );
};
