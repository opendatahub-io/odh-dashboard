import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ProjectObjectType,
  SectionType,
  sectionTypeBorderColor,
  typedObjectImage,
} from '~/concepts/design/utils';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import DividedGallery from '~/concepts/design/DividedGallery';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

const ConfigurationSection: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState<boolean>(true);
  const { currentProject } = React.useContext(ProjectDetailsContext);

  return (
    <CollapsibleSection
      title="Project configuration"
      data-testid="section-config"
      onOpenChange={setOpen}
      showChildrenWhenClosed
    >
      <DividedGallery
        minSize="225px"
        itemCount={3}
        style={{
          borderRadius: 16,
          border: `1px solid ${sectionTypeBorderColor(SectionType.setup)}`,
        }}
      >
        <InfoGalleryItem
          sectionType={SectionType.setup}
          imgSrc={typedObjectImage(ProjectObjectType.clusterStorage)}
          title="Cluster storage"
          description="To save your project data, you can add cluster storage and optionally connect the storage to a workbench."
          isOpen={open}
          onClick={() =>
            navigate(
              `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.CLUSTER_STORAGES}`,
            )
          }
        />
        <InfoGalleryItem
          sectionType={SectionType.setup}
          imgSrc={typedObjectImage(ProjectObjectType.dataConnection)}
          title="Data connections"
          description="You can add data connections to workbenches to connect your project to data inputs and object storage buckets. You can also use data connections to specify the location of your models during deployment."
          isOpen={open}
          onClick={() =>
            navigate(
              `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.DATA_CONNECTIONS}`,
            )
          }
        />
        <InfoGalleryItem
          sectionType={SectionType.setup}
          title="Permissions"
          imgSrc={typedObjectImage(ProjectObjectType.group)}
          description="Add users and groups to share access to your project."
          isOpen={open}
          onClick={() =>
            navigate(
              `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.PERMISSIONS}`,
            )
          }
        />
      </DividedGallery>
    </CollapsibleSection>
  );
};

export default ConfigurationSection;
