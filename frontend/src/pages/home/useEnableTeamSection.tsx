import * as React from 'react';
import { PageSection, Text, TextContent, TextVariants } from '@patternfly/react-core';
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
import { useBrowserStorage } from '~/components/browserStorage';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';

export const useEnableTeamSection = (): React.ReactNode => {
  const navigate = useNavigate();
  const [resourcesOpen, setResourcesOpen] = useBrowserStorage<boolean>(
    'odh.home.admin.open',
    true,
    true,
    false,
  );
  const { isAdmin } = useUser();
  const { status: notebooksAvailable } = useIsAreaAvailable(SupportedArea.BYON);
  const { status: servingRuntimesAvailable } = useIsAreaAvailable(SupportedArea.CUSTOM_RUNTIMES);
  const { status: clusterSettingsAvailable } = useIsAreaAvailable(SupportedArea.CLUSTER_SETTINGS);
  const { status: userManagementAvailable } = useIsAreaAvailable(SupportedArea.USER_MANAGEMENT);

  if (!isAdmin) {
    return null;
  }

  const infoItems = [];

  if (notebooksAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="notebook-images"
        testId="landing-page-admin--notebook-images"
        isOpen={resourcesOpen}
        title="Notebook images"
        onClick={() => navigate('/notebookImages')}
        imgSrc={notebookImagesImage}
        sectionType={SectionType.setup}
        description={
          <TextContent>
            <Text component="small">
              These are instances of your development and experimentation environment. They
              typically contain IDEs, such as JupyterLab, RStudio, and Visual Studio Code.
            </Text>
          </TextContent>
        }
      />,
    );
  }
  if (servingRuntimesAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="serving-runtimes"
        testId="landing-page-admin--serving-runtimes"
        isOpen={resourcesOpen}
        title="Serving runtimes"
        onClick={() => navigate('/servingRuntimes')}
        imgSrc={servingRuntimesImage}
        sectionType={SectionType.setup}
        description={
          <TextContent>
            <Text component="small">
              Administrators can access notebook servers that are owned by other users to correct
              configuration errors or help a data scientist troubleshoot problems with their
              environment.
            </Text>
          </TextContent>
        }
      />,
    );
  }
  if (clusterSettingsAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="cluster-settings"
        testId="landing-page-admin--cluster-settings"
        isOpen={resourcesOpen}
        title="Cluster settings"
        onClick={() => navigate('/clusterSettings')}
        imgSrc={clusterSettingsImage}
        sectionType={SectionType.setup}
        description={
          <TextContent>
            <Text component="small">
              You can change the default size of the cluster’s persistent volume claim (PVC)
              ensuring that the storage requested matches your common storage workflow.
            </Text>
          </TextContent>
        }
      />,
    );
  }
  if (userManagementAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="user-management"
        testId="landing-page-admin--user-management"
        isOpen={resourcesOpen}
        title="User management"
        onClick={() => navigate('/groupSettings')}
        imgSrc={userImage}
        sectionType={SectionType.setup}
        description={
          <TextContent>
            <Text component="small">
              If you plan to restrict access to your instance by defining specialized user groups,
              you must grant users permission access by adding user accounts to the Red Hat
              OpenShift AI user group, administrator group, or both.
            </Text>
          </TextContent>
        }
      />,
    );
  }

  if (!infoItems.length) {
    return null;
  }

  return (
    <PageSection data-testid="landing-page-admin" variant="light">
      <CollapsibleSection
        title="Enable your team"
        titleVariant={TextVariants.h1}
        open={resourcesOpen}
        setOpen={setResourcesOpen}
        showChildrenWhenClosed
      >
        <DividedGallery
          minSize="225px"
          itemCount={infoItems.length}
          style={{
            borderRadius: 16,
            border: `1px solid ${sectionTypeBorderColor(SectionType.setup)}`,
          }}
        >
          {infoItems}
        </DividedGallery>
      </CollapsibleSection>
    </PageSection>
  );
};
