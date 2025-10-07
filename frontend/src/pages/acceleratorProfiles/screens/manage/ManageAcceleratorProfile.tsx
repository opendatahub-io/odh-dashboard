import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Form, FormSection, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import GenericSidebar from '#~/components/GenericSidebar';

import { AcceleratorProfileKind } from '#~/k8sTypes';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { ManageAcceleratorProfileFooter } from './ManageAcceleratorProfileFooter';
import { ManageAcceleratorProfileTolerationsSection } from './ManageAcceleratorProfileTolerationsSection';
import { AcceleratorProfileFormData, ManageAcceleratorProfileSectionID } from './types';
import { ManageAcceleratorProfileSectionTitles, ScrollableSelectorID } from './const';
import { ManageAcceleratorProfileDetailsSection } from './ManageAcceleratorProfileDetailsSection';

type ManageAcceleratorProfileProps = {
  existingAcceleratorProfile?: AcceleratorProfileKind;
  contextPath?: string;
  homepageTitle?: string;
};

const ManageAcceleratorProfile: React.FC<ManageAcceleratorProfileProps> = ({
  existingAcceleratorProfile,
  contextPath = '/settings/environment-setup/accelerator-profiles',
  homepageTitle = 'Accelerator profiles',
}) => {
  const [state, setState] = useGenericObjectState<AcceleratorProfileFormData>({
    displayName: '',
    identifier: '',
    enabled: true,
    tolerations: [],
    name: '',
  });
  const { data: profileNameDesc, onDataChange: setProfileNameDesc } =
    useK8sNameDescriptionFieldData({
      initialData: existingAcceleratorProfile
        ? {
            name: existingAcceleratorProfile.spec.displayName,
            k8sName: existingAcceleratorProfile.metadata.name,
            description: existingAcceleratorProfile.spec.description,
          }
        : undefined,
    });

  React.useEffect(() => {
    if (existingAcceleratorProfile) {
      setState('identifier', existingAcceleratorProfile.spec.identifier);
      setState('enabled', existingAcceleratorProfile.spec.enabled);
      setState('tolerations', existingAcceleratorProfile.spec.tolerations);
    }
  }, [existingAcceleratorProfile, setState]);

  const formState: AcceleratorProfileFormData = React.useMemo(
    () => ({
      ...state,
      name: profileNameDesc.k8sName.value,
      displayName: profileNameDesc.name,
      description: profileNameDesc.description,
    }),
    [state, profileNameDesc],
  );

  const sectionIDs = Object.values(ManageAcceleratorProfileSectionID);

  const validFormData = isK8sNameDescriptionDataValid(profileNameDesc) && !!state.identifier;

  return (
    <ApplicationsPage
      title={
        existingAcceleratorProfile
          ? `Edit ${existingAcceleratorProfile.spec.displayName}`
          : 'Create accelerator profile'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={contextPath}>{homepageTitle}</Link>} />
          <BreadcrumbItem>
            {existingAcceleratorProfile ? 'Edit' : 'Create'} accelerator profile
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection
        hasBodyWrapper={false}
        isFilled
        id={ScrollableSelectorID}
        aria-label="manage-accelerator-spawner-section"
      >
        <GenericSidebar sections={sectionIDs} titles={ManageAcceleratorProfileSectionTitles}>
          <Form style={{ maxWidth: 600 }}>
            <FormSection
              id={ManageAcceleratorProfileSectionID.DETAILS}
              aria-label={
                ManageAcceleratorProfileSectionTitles[ManageAcceleratorProfileSectionID.DETAILS]
              }
              title={
                ManageAcceleratorProfileSectionTitles[ManageAcceleratorProfileSectionID.DETAILS]
              }
            >
              <K8sNameDescriptionField
                data={profileNameDesc}
                onDataChange={setProfileNameDesc}
                dataTestId="accelerator-profile"
              />
              <ManageAcceleratorProfileDetailsSection state={state} setState={setState} />
            </FormSection>
            <ManageAcceleratorProfileTolerationsSection
              tolerations={state.tolerations ?? []}
              setTolerations={(tolerations) => setState('tolerations', tolerations)}
            />
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <ManageAcceleratorProfileFooter
          state={formState}
          existingAcceleratorProfile={existingAcceleratorProfile}
          validFormData={validFormData}
          redirectPath={contextPath}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ManageAcceleratorProfile;
