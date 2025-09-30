import React from 'react';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { Form, Title, Stack, StackItem, Alert, FormGroup, Popover } from '@patternfly/react-core';
import {
  AccessReviewResourceAttributes,
  K8sDSGResource,
  ProjectKind,
  ServingContainer,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import { isServingRuntimeKind } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { useAccessReview } from '../../../../../../frontend/src/api';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import { TokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { RuntimeArgsField } from '../fields/RuntimeArgsField';
import { EnvironmentVariablesField } from '../fields/EnvironmentVariablesField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { AvailableAiAssetsFieldsComponent } from '../fields/AvailableAiAssetsFields';

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

  // TODO: Clean up the stuff below related to KServe. Maybe move to an extension?
  const selectedModelServer =
    wizardState.state.modelFormatState.templatesFilteredForModelType?.find(
      (template) =>
        template.metadata.name === wizardState.state.modelServer.data?.name &&
        template.metadata.namespace === wizardState.state.modelServer.data.namespace,
    )?.objects[0];

  const getKServeContainer = (servingRuntime?: ServingRuntimeKind): ServingContainer | undefined =>
    servingRuntime?.spec.containers.find((container) => container.name === 'kserve-container');

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
        name: 'default-token',
        error: '',
      };
      wizardState.state.tokenAuthentication.setData([defaultToken]);
    }
  };

  return (
    <>
      <Form>
        <Stack>
          <StackItem>
            <Title headingLevel="h2">Advanced Settings (optional)</Title>
          </StackItem>
        </Stack>

        <Stack hasGutter>
          <StackItem>
            <FormGroup
              label="External route"
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
          <StackItem>
            <FormGroup
              label="AI Asset"
              data-testid="ai-asset-section"
              fieldId="ai-asset"
              labelHelp={
                <Popover bodyContent="POPOVER BODY CONTENT" headerContent="POPOVER HEADER CONTENT">
                  <DashboardPopupIconButton
                    icon={<OutlinedQuestionCircleIcon />}
                    aria-label="More info"
                  />
                </Popover>
              }
            >
              <AvailableAiAssetsFieldsComponent
                data={wizardState.state.AiAssetData.data}
                setData={wizardState.state.AiAssetData.setData}
                wizardData={wizardState}
              />
            </FormGroup>
          </StackItem>

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
      </Form>
    </>
  );
};
