import * as React from 'react';
import { Content } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import InfoGalleryItem from '#~/concepts/design/InfoGalleryItem';
import { SupportedArea } from '#~/concepts/areas';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import InfoGallery from './InfoGallery';

const ProjectsGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);
  const { status: modelServingAvailable } = useIsAreaAvailable(SupportedArea.MODEL_SERVING);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;

  const getProjectDescriptionAdditionalText = () => {
    if (pipelinesAvailable && modelServingAvailable) {
      if (modelMeshEnabled) {
        return (
          <span data-testid="project-workbenches--trailer-model-mesh">
            In addition, the workbenches can share models and data with pipelines and model servers.
          </span>
        );
      }
      return (
        <span data-testid="project-workbenches--trailer-no-model-mesh">
          In addition, the workbenches can share models and data with pipelines.
        </span>
      );
    }
    if (pipelinesAvailable) {
      return (
        <span data-testid="project-workbenches--trailer-no-model-serving">
          In addition, the workbenches can share models and data with pipelines.
        </span>
      );
    }
    if (modelServingAvailable && modelMeshEnabled) {
      return (
        <span data-testid="project-workbenches--trailer-no-pipelines">
          In addition, the workbenches can share models and data with model servers.
        </span>
      );
    }
    return null;
  };

  const infoItems = [
    <InfoGalleryItem
      key="projects"
      data-testid="ai-flows-projects-info"
      title="Data science projects"
      resourceType={ProjectObjectType.project}
      sectionType={SectionType.organize}
      description={
        <Content>
          <Content component="small">
            Data science projects allow you and your team to organize and collaborate on resources
            within separate namespaces.
          </Content>
          <Content component="small">
            Within a project, you can create multiple workbenches, each with their own IDE, data
            connections, and cluster storage. {getProjectDescriptionAdditionalText()}
          </Content>
        </Content>
      }
      isOpen
    />,
    <InfoGalleryItem
      key="connections"
      data-testid="ai-flows-connections-info"
      title="Connections"
      resourceType={ProjectObjectType.dataConnection}
      sectionType={SectionType.organize}
      description={
        <Content component="small">
          Connections enable you to store and retrieve information that typically should not be
          stored in code. For example, you can store details (including credentials) for object
          storage, databases, and more. You can then attach the connections to artifacts in your
          project, such as workbenches and model servers.
        </Content>
      }
      isOpen
    />,
    <InfoGalleryItem
      key="storage"
      data-testid="ai-flows-storage-info"
      title="Cluster storage"
      resourceType={ProjectObjectType.clusterStorage}
      sectionType={SectionType.organize}
      description={
        <Content component="small">
          Add cluster storage to a workbench for saving your project’s data to your cluster.
        </Content>
      }
      isOpen
    />,
  ];

  return (
    <InfoGallery
      infoItems={infoItems}
      closeAlt="organizing your work"
      onClose={onClose}
      closeTestId="ai-flows-close-info"
    />
  );
};

export default ProjectsGallery;
