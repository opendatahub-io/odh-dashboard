import * as React from 'react';
import { PageSection, Content, ContentVariants } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import CollapsibleSection from '#~/concepts/design/CollapsibleSection';
import { ProjectObjectType, SectionType, sectionTypeBorderColor } from '#~/concepts/design/utils';
import DividedGallery from '#~/concepts/design/DividedGallery';
import { useUser } from '#~/redux/selectors';
import InfoGalleryItem from '#~/concepts/design/InfoGalleryItem';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { SupportedArea } from '#~/concepts/areas';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { fireLinkTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

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

  const trackAndNavigate = (section: string, to: string): void => {
    fireLinkTrackingEvent('HomeCardClicked', {
      to: `${to}`,
      type: 'enableTeam',
      section: `${section}`,
    });
    navigate(to);
  };

  const infoItems = [];

  if (notebooksAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="notebook-images"
        testId="landing-page-admin--notebook-images"
        isOpen={resourcesOpen}
        title="Workbench images"
        onClick={() =>
          trackAndNavigate('workbench-images', '/settings/environment-setup/workbench-images')
        }
        resourceType={ProjectObjectType.notebookImage}
        sectionType={SectionType.setup}
        description={
          <Content>
            <Content component="small">
              These are instances of your development and experimentation environment. They
              typically contain IDEs, such as JupyterLab, RStudio, and Visual Studio Code.
            </Content>
          </Content>
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
        onClick={() =>
          trackAndNavigate(
            'serving-runtimes',
            '/settings/model-resources-operations/serving-runtimes',
          )
        }
        resourceType={ProjectObjectType.servingRuntime}
        sectionType={SectionType.setup}
        description={
          <Content>
            <Content component="small">
              A model-serving runtime adds support for a specified set of model frameworks. You can
              use a default serving runtime, or add and enable a custom serving runtime.
            </Content>
          </Content>
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
        onClick={() => trackAndNavigate('cluster-settings', '/settings/cluster/general')}
        resourceType={ProjectObjectType.clusterSettings}
        sectionType={SectionType.setup}
        description={
          <Content>
            <Content component="small">
              You can change the default size of the cluster’s persistent volume claim (PVC)
              ensuring that the storage requested matches your common storage workflow.
            </Content>
          </Content>
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
        onClick={() => trackAndNavigate('user-management', '/settings/user-management')}
        resourceType={ProjectObjectType.permissions}
        sectionType={SectionType.setup}
        description={
          <Content>
            <Content component="small">
              If you plan to restrict access to your instance by defining specialized user groups,
              you must grant users permission access by adding user accounts to the Red Hat
              OpenShift AI user groups, administrator groups, or both.
            </Content>
          </Content>
        }
      />,
    );
  }

  if (!infoItems.length) {
    return null;
  }

  return (
    <PageSection hasBodyWrapper={false} data-testid="landing-page-admin">
      <CollapsibleSection
        title="Enable your team"
        titleVariant={ContentVariants.h1}
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
