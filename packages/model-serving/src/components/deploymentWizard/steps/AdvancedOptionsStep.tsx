import React from 'react';
import type { K8sDSGResource, AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { Form, Stack, StackItem, FormGroup, FormSection, Spinner } from '@patternfly/react-core';
import {
  ServingContainer,
  ServingRuntimeKind,
  isServingRuntimeKind,
  isTemplateKind,
} from '@odh-dashboard/model-serving/shared';
import UsersAndAvailabilityForm from '../../deployments/UsersAndAvailabilityForm';
import { RuntimeArgsField } from '../fields/RuntimeArgsField';
import { EnvironmentVariablesField } from '../fields/EnvironmentVariablesField';
import { DeploymentStrategyField } from '../fields/DeploymentStrategyField';
import { GenericFieldRenderer } from '../fields/GenericFieldRenderer';
import { type UseModelDeploymentWizardState } from '../useDeploymentWizard';
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

  if (!wizardState.loaded.advancedOptionsLoaded) {
    return <Spinner data-testid="spinner" />;
  }

  return (
    <>
      <Form>
        <FormSection title="Advanced settings">
          <Stack hasGutter>
            <StackItem>
              <UsersAndAvailabilityForm
                wizardState={wizardState}
                externalData={externalData}
                allowCreate={allowCreate}
              />
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
