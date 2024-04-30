import * as React from 'react';
import { Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType, typedObjectImage } from '~/concepts/design/utils';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
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
      title="Projects"
      imgSrc={typedObjectImage(ProjectObjectType.project)}
      sectionType={SectionType.organize}
      description={
        <TextContent>
          <Text component="small">
            Projects allow you and your team to organize and collaborate on resources within
            separate namespaces.
          </Text>
          <Text component="small">
            Within a project, you can create multiple workbenches, each with their own IDE, data
            connections, and cluster storage. {getProjectDescriptionAdditionalText()}
          </Text>
        </TextContent>
      }
      isOpen
    />,
    <InfoGalleryItem
      key="connections"
      data-testid="ai-flows-connections-info"
      title="Data connections"
      imgSrc={typedObjectImage(ProjectObjectType.dataConnection)}
      sectionType={SectionType.organize}
      description={
        <TextContent>
          <Text component="small">
            You can add data connections to link your project and its workbenches to data sources,
            and to object storage buckets which save data and models that you want to deploy.
          </Text>
        </TextContent>
      }
      isOpen
    />,
    <InfoGalleryItem
      key="storage"
      data-testid="ai-flows-storage-info"
      title="Cluster storage"
      imgSrc={typedObjectImage(ProjectObjectType.clusterStorage)}
      sectionType={SectionType.organize}
      description={
        <TextContent>
          <Text component="small">
            Add cluster storage to a workbench for saving your project’s data to your cluster.
          </Text>
        </TextContent>
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
