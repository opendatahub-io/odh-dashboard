import * as React from 'react';
import { ProjectObjectType, SectionType, typedObjectImage } from '~/concepts/design/utils';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import InfoGallery from './InfoGallery';

const ProjectsGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;

  const projectDescription = `Projects allow you to organize your related work in one place. You can add workbenches, ${
    pipelinesAvailable ? 'pipelines, ' : ''
  }cluster storage, data connections, and model${
    modelMeshEnabled ? ' servers' : 's'
  } to your project.`;

  const infoItems = [
    <InfoGalleryItem
      key="projects"
      data-testid="ai-flows-projects-info"
      title="Projects"
      imgSrc={typedObjectImage(ProjectObjectType.project)}
      sectionType={SectionType.organize}
      description={projectDescription}
      isOpen
    />,
    <InfoGalleryItem
      key="connections"
      data-testid="ai-flows-connections-info"
      title="Data connections"
      imgSrc={typedObjectImage(ProjectObjectType.dataConnection)}
      sectionType={SectionType.organize}
      description="You can add data connections to workbenches to connect your project to data inputs and object storage buckets. You can also use data connections to specify the location of your models during deployment."
      isOpen
    />,
    <InfoGalleryItem
      key="storage"
      data-testid="ai-flows-storage-info"
      title="Cluster storage"
      imgSrc={typedObjectImage(ProjectObjectType.clusterStorage)}
      sectionType={SectionType.organize}
      description="Cluster storage can be added to a workbench to save your project’s data on a selected cluster."
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
