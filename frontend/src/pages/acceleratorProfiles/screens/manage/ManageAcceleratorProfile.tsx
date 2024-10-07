import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Form, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import GenericSidebar from '~/components/GenericSidebar';

import { AcceleratorProfileKind } from '~/k8sTypes';
import { ManageAcceleratorProfileFooter } from './ManageAcceleratorProfileFooter';
import { ManageAcceleratorProfileTolerationsSection } from './ManageAcceleratorProfileTolerationsSection';
import { ManageAcceleratorProfileSectionID } from './types';
import { ManageAcceleratorProfileSectionTitles, ScrollableSelectorID } from './const';
import { ManageAcceleratorProfileDetailsSection } from './ManageAcceleratorProfileDetailsSection';

type ManageAcceleratorProfileProps = {
  existingAcceleratorProfile?: AcceleratorProfileKind;
};

const ManageAcceleratorProfile: React.FC<ManageAcceleratorProfileProps> = ({
  existingAcceleratorProfile,
}) => {
  const [state, setState] = useGenericObjectState<AcceleratorProfileKind['spec']>({
    displayName: '',
    identifier: '',
    enabled: true,
    tolerations: [],
  });

  React.useEffect(() => {
    if (existingAcceleratorProfile) {
      setState('displayName', existingAcceleratorProfile.spec.displayName);
      setState('identifier', existingAcceleratorProfile.spec.identifier);
      setState('description', existingAcceleratorProfile.spec.description);
      setState('enabled', existingAcceleratorProfile.spec.enabled);
      setState('tolerations', existingAcceleratorProfile.spec.tolerations);
    }
  }, [existingAcceleratorProfile, setState]);

  const sectionIDs = Object.values(ManageAcceleratorProfileSectionID);

  return (
    <ApplicationsPage
      title={
        existingAcceleratorProfile
          ? `Edit ${existingAcceleratorProfile.spec.displayName}`
          : 'Create accelerator profile'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to="/acceleratorProfiles">Accelerator profiles</Link>}
          />
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
            <ManageAcceleratorProfileDetailsSection state={state} setState={setState} />
            <ManageAcceleratorProfileTolerationsSection
              tolerations={state.tolerations ?? []}
              setTolerations={(tolerations) => setState('tolerations', tolerations)}
            />
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <ManageAcceleratorProfileFooter
          state={state}
          existingAcceleratorProfile={existingAcceleratorProfile}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ManageAcceleratorProfile;
