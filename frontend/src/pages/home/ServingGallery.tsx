import * as React from 'react';
import { ProjectObjectType, SectionType, typedObjectImage } from '~/concepts/design/utils';
import DividedGallery from '~/concepts/design/DividedGallery';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';

const ServingGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => (
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
      title="Model servers"
      imgSrc={typedObjectImage(ProjectObjectType.modelServer)}
      sectionType={SectionType.serving}
      description="Model servers allow you to deploy models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authorization, and how the project that the model server belongs to is accessed."
      isOpen
    />
    <InfoGalleryItem
      title="Deploying models"
      imgSrc={typedObjectImage(ProjectObjectType.deployingModels)}
      sectionType={SectionType.serving}
      description="Deploy models to test and implement them into intelligent applications. Deploying a model makes it available as a service that you can access using an API, enabling you to return predictions based on data inputs."
      isOpen
    />
  </DividedGallery>
);

export default ServingGallery;
