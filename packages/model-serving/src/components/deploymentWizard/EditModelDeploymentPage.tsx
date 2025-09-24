import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import {
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { setupDefaults } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types.js';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types.js';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { ModelDeploymentWizardData } from './useDeploymentWizard';
import {
  getModelTypeFromDeployment,
  getTokenAuthenticationFromDeployment,
  getExternalRouteFromDeployment,
} from './utils';
import { useModelLocationData } from './fields/ModelLocationInputFields';
import {
  Deployment,
  isModelServingDeploymentFormDataExtension,
  ModelServingDeploymentFormDataExtension,
} from '../../../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../../concepts/ModelDeploymentsContext';
import {
  ModelServingPlatform,
  useProjectServingPlatform,
} from '../../concepts/useProjectServingPlatform';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';

const ErrorContent: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();
  return (
    <Bullseye>
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Unable to edit model deployment"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={() => navigate(`/modelServing/`)}>
              Return to model serving
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};
function useEditDeploymentData(
  existingDeployment: Deployment | undefined,
  formDataExtension: ReturnType<
    typeof useResolvedDeploymentExtension<ModelServingDeploymentFormDataExtension<Deployment>>
  >[0],
  connectionTypes: ConnectionTypeConfigMapObj[],
) {
  const [formData, setFormData] = React.useState<ModelDeploymentWizardData>();
  const [dataLoaded, setDataLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!existingDeployment || !formDataExtension || dataLoaded) return;

    (async () => {
      const modelLocationData = await formDataExtension.properties.extractModelLocationData(
        existingDeployment,
        connectionTypes,
      );

      setFormData({
        modelTypeField: getModelTypeFromDeployment(existingDeployment),
        k8sNameDesc: setupDefaults({ initialData: existingDeployment.model }),
        hardwareProfile:
          formDataExtension.properties.extractHardwareProfileConfig(existingDeployment) ??
          undefined,
        modelFormat:
          formDataExtension.properties.extractModelFormat(existingDeployment) ?? undefined,
        modelLocationData: modelLocationData ?? undefined,
        externalRoute: getExternalRouteFromDeployment(existingDeployment),
        tokenAuthentication: getTokenAuthenticationFromDeployment(existingDeployment),
      });
      setDataLoaded(true);
    })();
  }, [existingDeployment, formDataExtension, connectionTypes, dataLoaded]);

  return { formData, dataLoaded };
}

const EditModelDeploymentPage: React.FC = () => {
  const { namespace } = useParams();

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = React.useMemo(
    () => projects.find(byName(namespace)),
    [projects, namespace],
  );

  const { clusterPlatforms, clusterPlatformsLoaded, clusterPlatformsError } =
    useAvailableClusterPlatforms();
  const { activePlatform } = useProjectServingPlatform(currentProject, clusterPlatforms);

  if (!projectsLoaded || !clusterPlatformsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!currentProject || !activePlatform || clusterPlatformsError) {
    return (
      <ErrorContent
        error={
          clusterPlatformsError ??
          new Error(
            !currentProject
              ? `Project ${namespace ?? ''} not found.`
              : !activePlatform
              ? 'No model serving platform is configured for this project.'
              : 'Unable to edit model deployment.',
          )
        }
      />
    );
  }

  return (
    <ModelDeploymentsProvider projects={[currentProject]}>
      <EditModelDeploymentContent project={currentProject} modelServingPlatform={activePlatform} />
    </ModelDeploymentsProvider>
  );
};

export default EditModelDeploymentPage;

const EditModelDeploymentContent: React.FC<{
  project: ProjectKind;
  modelServingPlatform: ModelServingPlatform;
}> = ({ project, modelServingPlatform }) => {
  const { name: deploymentName } = useParams();
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const { dashboardNamespace } = useDashboardNamespace();

  const existingDeployment = React.useMemo(() => {
    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, deploymentName]);

  const [formDataExtension, formDataExtensionLoaded, formDataExtensionErrors] =
    useResolvedDeploymentExtension(isModelServingDeploymentFormDataExtension, existingDeployment);

  const extractFormDataFromDeployment: (deployment: Deployment) => ModelDeploymentWizardData = (
    deployment: Deployment,
  ) => ({
    modelTypeField: getModelTypeFromDeployment(deployment),
    k8sNameDesc: setupDefaults({ initialData: deployment.model }),
    hardwareProfile:
      formDataExtension?.properties.extractHardwareProfileConfig(deployment) ?? undefined,
    modelFormat: formDataExtension?.properties.extractModelFormat(deployment) ?? undefined,
    numReplicas: formDataExtension?.properties.extractReplicas(deployment) ?? undefined,
    modelLocationData: setupModelLocationData(), // TODO: Implement fully in next ticket RHOAIENG-32186
    externalRoute: getExternalRouteFromDeployment(deployment),
    tokenAuthentication: getTokenAuthenticationFromDeployment(deployment),
    runtimeArgs: formDataExtension?.properties.extractRuntimeArgs(deployment) ?? undefined,
    environmentVariables:
      formDataExtension?.properties.extractEnvironmentVariables(deployment) ?? undefined,
    AiAssetData: formDataExtension?.properties.extractAiAssetData(deployment) ?? undefined,
    modelServer: {
      name: deployment.server?.metadata.annotations?.['opendatahub.io/template-name'] || '',
      namespace:
        deployment.server?.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
        'global'
          ? dashboardNamespace
          : deployment.server?.metadata.namespace || '',
      scope:
        deployment.server?.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] || '',
    },
  });

  const { formData, dataLoaded } = useEditDeploymentData(
    existingDeployment,
    formDataExtension,
    connectionTypes,
  );

  if (formDataExtensionErrors.length > 0) {
    return <ErrorContent error={formDataExtensionErrors[0]} />;
  }

  if (!deploymentsLoaded || !formDataExtensionLoaded || !connectionsLoaded || !dataLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ModelDeploymentWizard
      title="Edit model deployment"
      description="Update your model deployment configuration."
      primaryButtonText="Update deployment"
      existingData={formData ? { ...formData, isEditing: true } : { isEditing: true }}
      project={project}
      modelServingPlatform={modelServingPlatform}
    />
  );
};
