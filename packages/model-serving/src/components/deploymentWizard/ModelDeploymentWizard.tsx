import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import {
  Connection,
  ConnectionTypeConfigMapObj,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { getConnectionTypeRef } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { getDeploymentWizardExitRoute } from './utils';
import { useModelDeploymentWizard, type ModelDeploymentWizardData } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { WizardFooterWithDisablingNext } from './WizardFooterWithDisablingNext';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { ModelLocationType } from './fields/modelLocationFields/types';
import { isModelServingDeploy } from '../../../extension-points';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  existingData?: ModelDeploymentWizardData;
  project: ProjectKind;
  modelServingPlatform: ModelServingPlatform;
  connections: Connection[];
  selectedConnection: Connection | undefined;
  connectionTypes: ConnectionTypeConfigMapObj[];
  setSelectedConnection: (connection: Connection | undefined) => void;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
  project,
  modelServingPlatform,
  connections,
  selectedConnection,
  connectionTypes,
  setSelectedConnection,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [deployExtension, deployExtensionLoaded] = useResolvedPlatformExtension(
    isModelServingDeploy,
    modelServingPlatform,
  );

  const exitWizard = React.useCallback(() => {
    navigate(getDeploymentWizardExitRoute(location.pathname));
  }, [navigate, location.pathname]);

  const wizardState = useModelDeploymentWizard(existingData);
  const validation = useModelDeploymentWizardValidation(wizardState.state);

  const onSave = React.useCallback(() => {
    // Use existing validation to prevent submission with invalid data
    if (
      !validation.isModelSourceStepValid ||
      !validation.isModelDeploymentStepValid ||
      !deployExtensionLoaded
    ) {
      return;
    }

    const serverResourceTemplateName = wizardState.state.modelServer.data?.name;
    const allModelServerTemplates =
      wizardState.state.modelFormatState.templatesFilteredForModelType;
    const serverResource = serverResourceTemplateName
      ? getServingRuntimeFromTemplate(
          allModelServerTemplates?.find(
            (template) => template.metadata.name === serverResourceTemplateName,
          ),
        )
      : undefined;

    Promise.all([
      deployExtension?.properties.deploy(
        wizardState.state,
        project.metadata.name,
        undefined,
        serverResource,
        serverResourceTemplateName,
        true,
      ),
    ]).then(() => {
      Promise.all([
        deployExtension?.properties.deploy(
          wizardState.state,
          project.metadata.name,
          undefined,
          serverResource,
          serverResourceTemplateName,
          false,
        ),
      ]).then(() => {
        exitWizard();
      });
    });
  }, [
    exitWizard,
    project.metadata.name,
    deployExtensionLoaded,
    deployExtension,
    wizardState.state,
    validation.isModelSourceStepValid,
    validation.isModelDeploymentStepValid,
  ]);

  const updateSelectedConnection = React.useCallback(
    (connection: Connection | undefined) => {
      if (!connection) {
        setSelectedConnection(undefined);
        return;
      }
      const connectionTypeRef = getConnectionTypeRef(connection);
      const selectedConnectionType = connectionTypes.find(
        (ct) => ct.metadata.name === connectionTypeRef,
      );
      if (selectedConnectionType) {
        setSelectedConnection(connection);
        wizardState.state.modelLocationData.setData({
          type: ModelLocationType.EXISTING,
          connectionTypeObject: selectedConnectionType,
          connection: getResourceNameFromK8sResource(connection),
          fieldValues: {},
          additionalFields: {},
        });
      }
    },
    [wizardState.state.modelLocationData.setData, setSelectedConnection, connectionTypes],
  );
  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      <Wizard onClose={exitWizard} onSave={onSave} footer={<WizardFooterWithDisablingNext />}>
        <WizardStep name="Source model" id="source-model-step">
          <ModelSourceStepContent
            wizardState={wizardState}
            validation={validation.modelSource}
            connections={connections}
            selectedConnection={selectedConnection}
            setSelectedConnection={updateSelectedConnection}
          />
        </WizardStep>
        <WizardStep
          name="Model deployment"
          id="model-deployment-step"
          isDisabled={!validation.isModelSourceStepValid}
        >
          <ModelDeploymentStepContent
            projectName={project.metadata.name}
            wizardState={wizardState}
          />
        </WizardStep>
        <WizardStep
          name="Advanced settings (optional)"
          id="advanced-options-step"
          isDisabled={!validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid}
        >
          <AdvancedSettingsStepContent wizardState={wizardState} project={project} />
        </WizardStep>
        <WizardStep
          name="Summary"
          id="summary-step"
          footer={{ nextButtonText: primaryButtonText }}
          isDisabled={
            !validation.isModelSourceStepValid ||
            !validation.isModelDeploymentStepValid ||
            !validation.isAdvancedSettingsStepValid
          }
        >
          Review step content
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
