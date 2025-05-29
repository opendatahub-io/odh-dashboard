import * as React from 'react';
import { Content } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import InfoGalleryItem from '#~/concepts/design/InfoGalleryItem';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '#~/concepts/areas';
import InfoGallery from './InfoGallery';

const DeployAndMonitorGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const servingPlatformStatuses = useServingPlatformStatuses();
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;
  const kServeEnabled = servingPlatformStatuses.kServe.enabled;

  const infoItems = [];

  if (modelRegistryAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="model-registry"
        data-testid="ai-flows-model-registry-info"
        title="Model registry"
        resourceType={ProjectObjectType.modelRegistrySettings}
        sectionType={SectionType.serving}
        description={
          <Content>
            <Content component="small">
              Model registries provide a structured and organized way to store, version, deploy, and
              track models, ensuring that they are easily accessible and manageable throughout their
              lifecycle.
            </Content>
          </Content>
        }
        isOpen
      />,
    );
  }

  if (modelMeshEnabled) {
    infoItems.push(
      <InfoGalleryItem
        key="model-servers"
        data-testid="ai-flows-model-servers-info"
        title="Model servers"
        resourceType={ProjectObjectType.modelServer}
        sectionType={SectionType.serving}
        description={
          <Content>
            <Content component="small">
              Use model servers to deploy models for testing and implementing in intelligent
              applications. Configuring a model server includes specifying the number of replicas
              being deployed, the server size, the token authentication, the serving runtime, and
              how the project that the model server belongs to is accessed.
            </Content>
          </Content>
        }
        isOpen
      />,
    );
  }

  if (modelMeshEnabled || kServeEnabled) {
    infoItems.push(
      <InfoGalleryItem
        key="model-deploy"
        data-testid="ai-flows-model-deploy-info"
        title="Deploying models"
        resourceType={ProjectObjectType.deployingModels}
        sectionType={SectionType.serving}
        description={
          <Content>
            <Content component="small">
              Deploy models to test them and integrate them into applications. Deploying a model
              makes it accessible via an API, enabling you to return predictions based on data
              inputs.
            </Content>
          </Content>
        }
        isOpen
      />,
    );
  }

  return (
    <InfoGallery
      infoItems={infoItems}
      closeAlt="deploy models"
      onClose={onClose}
      closeTestId="ai-flows-close-info"
    />
  );
};

export default DeployAndMonitorGallery;
