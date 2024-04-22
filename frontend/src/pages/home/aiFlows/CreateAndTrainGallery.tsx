import * as React from 'react';
import { ProjectObjectType, SectionType, typedObjectImage } from '~/concepts/design/utils';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import InfoGallery from './InfoGallery';

const CreateAndTrainGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { status: workbenchesAvailable } = useIsAreaAvailable(SupportedArea.WORKBENCHES);
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);

  const infoItems = [];

  if (workbenchesAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="workbenches"
        data-testid="ai-flows-workbenches-info"
        title="Workbenches"
        imgSrc={typedObjectImage(ProjectObjectType.notebook)}
        sectionType={SectionType.training}
        description="A workbench is an isolated area where you can work with models in your preferred IDE, such as a Jupyter notebook. You can add accelerators and data connections, create pipelines, and add cluster storage in your workbench."
        isOpen
      />,
    );
  }

  if (pipelinesAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="piplelines"
        data-testid="ai-flows-pipelines-info"
        title="Pipelines"
        imgSrc={typedObjectImage(ProjectObjectType.pipeline)}
        sectionType={SectionType.training}
        description="Pipelines are platforms for building and deploying portable and scalable machine-learning (ML) workflows."
        isOpen
      />,
      <InfoGalleryItem
        key="runs"
        data-testid="ai-flows-runs-info"
        title="Runs"
        imgSrc={typedObjectImage(ProjectObjectType.pipelineRun)}
        sectionType={SectionType.training}
        description="Runs represent a single execution of a pipeline. Runs enable you to test your pipelines by executing each step of a pipeline until complete, or until a failure occurs."
        isOpen
      />,
    );
  }

  return (
    <InfoGallery
      infoItems={infoItems}
      onClose={onClose}
      closeAlt="train your models"
      closeTestId="ai-flows-close-info"
    />
  );
};

export default CreateAndTrainGallery;
