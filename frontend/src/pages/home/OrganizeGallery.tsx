import * as React from 'react';
import { ProjectObjectType, SectionType, typedObjectImage } from '~/concepts/design/utils';
import DividedGallery from '~/concepts/design/DividedGallery';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';

const OrganizeGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <DividedGallery
    minSize="225px"
    itemCount={3}
    showClose
    onClose={onClose}
    style={{
      borderRadius: 16,
      border: `1px solid var(--pf-v5-global--BorderColor--100)`,
    }}
  >
    <InfoGalleryItem
      title="Projects"
      imgSrc={typedObjectImage(ProjectObjectType.project)}
      sectionType={SectionType.organize}
      description="Projects allow you organize your related work in one place. You can enhance the capabilities of your project by adding workbenches, cluster storage, data connections, and model servers."
      isOpen
    />
    <InfoGalleryItem
      title="Data connections"
      imgSrc={typedObjectImage(ProjectObjectType.dataConnection)}
      sectionType={SectionType.organize}
      description="For projects that use very large data sets, you can use data connections to connect to an object storage bucket."
      isOpen
    />
    <InfoGalleryItem
      title="Cluster storage"
      imgSrc={typedObjectImage(ProjectObjectType.clusterStorage)}
      sectionType={SectionType.organize}
      description="To save your project data, you can add cluster storage and optionally connect the storage to a workbench."
      isOpen
    />
  </DividedGallery>
);

export default OrganizeGallery;
