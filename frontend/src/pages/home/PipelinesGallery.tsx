import * as React from 'react';
import { ProjectObjectType, SectionType, typedObjectImage } from '~/concepts/design/utils';
import DividedGallery from '~/concepts/design/DividedGallery';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';

const PipelinesGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <DividedGallery
    minSize="225px"
    itemCount={2}
    showClose
    onClose={onClose}
    style={{
      borderRadius: 16,
      border: `1px solid var(--pf-v5-global--BorderColor--100)`,
    }}
  >
    <InfoGalleryItem
      title="Pipelines"
      imgSrc={typedObjectImage(ProjectObjectType.pipeline)}
      sectionType={SectionType.training}
      description="Pipelines are a sequence of steps that automate and standardize the machine learning workflows used to train models."
      isOpen
    />
    <InfoGalleryItem
      title="Runs"
      imgSrc={typedObjectImage(ProjectObjectType.pipelineRun)}
      sectionType={SectionType.training}
      description="Runs represent a single execution of a pipeline. Runs execute each step of a pipeline until complete, or until a failure occurs. This enables you to test your pipelines."
      isOpen
    />
  </DividedGallery>
);

export default PipelinesGallery;
