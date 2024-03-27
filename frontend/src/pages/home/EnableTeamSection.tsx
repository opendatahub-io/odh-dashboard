import * as React from 'react';
import { PageSection, PageSectionProps } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import { SectionType, sectionTypeBorderColor } from '~/concepts/design/utils';
import notebookImagesImage from '~/images/UI_icon-Red_Hat-Notebook-Images-RGB.svg';
import servingRuntimesImage from '~/images/Icon-Red_Hat-Sys_admin-A-Black-RGB.svg';
import clusterSettingsImage from '~/images/Icon-Red_Hat-Storage-A-Black-RGB.svg';
import userImage from '~/images/UI_icon-Red_Hat-User-RGB.svg';
import DividedGallery from '~/concepts/design/DividedGallery';
import { useUser } from '~/redux/selectors';
import InfoGalleryItem from '~/concepts/design/InfoGalleryItem';

const EnableTeamSection: React.FC<PageSectionProps> = (props) => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState<boolean>(true);
  const { isAdmin } = useUser();

  if (!isAdmin) {
    return null;
  }

  return (
    <PageSection data-testid="landing-page-admin" variant="light" {...props}>
      <CollapsibleSection
        sectionType={SectionType.setup}
        title="Enable your team"
        titleComponent="h1"
        onOpenChange={setOpen}
        showChildrenWhenClosed
      >
        <DividedGallery
          minSize="225px"
          itemCount={4}
          style={{
            borderRadius: 16,
            border: `1px solid ${sectionTypeBorderColor(SectionType.setup)}`,
          }}
        >
          <InfoGalleryItem
            isOpen={open}
            title="Notebook images"
            onClick={() => navigate('/notebookImages')}
            imgSrc={notebookImagesImage}
            sectionType={SectionType.setup}
            description="These are instances of your development and experimentation environment. They
                typically contain IDEs, such as JupyterLab, RStudio, and Visual Studio Code."
          />
          <InfoGalleryItem
            isOpen={open}
            title="Serving runtimes"
            onClick={() => navigate('/servingRuntimes')}
            imgSrc={servingRuntimesImage}
            sectionType={SectionType.setup}
            description="Administrators can access notebook servers that are owned by other users to correct
              configuration errors or help a data scientist troubleshoot problems with their
              environment."
          />
          <InfoGalleryItem
            isOpen={open}
            title="Cluster settings"
            onClick={() => navigate('/clusterSettings')}
            imgSrc={clusterSettingsImage}
            sectionType={SectionType.setup}
            description="
              You can change the default size of the cluster’s persistent volume claim (PVC)
              ensuring that the storage requested matches your common storage workflow."
          />
          <InfoGalleryItem
            isOpen={open}
            title="User management"
            onClick={() => navigate('/groupSettings')}
            imgSrc={userImage}
            sectionType={SectionType.setup}
            description="If you plan to restrict access to your instance by defining specialized user groups,
              you must grant users permission access by adding user accounts to the Red Hat
              OpenShift AI user group, administrator group, or both."
          />
        </DividedGallery>
      </CollapsibleSection>
    </PageSection>
  );
};

export default EnableTeamSection;
