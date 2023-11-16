import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Form, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import GenericSidebar from '~/components/GenericSidebar';

import { AcceleratorKind } from '~/k8sTypes';
import { ManageAcceleratorProfileFooter } from './ManageAcceleratorProfileFooter';
import { ManageAcceleratorProfileTolerationsSection } from './ManageAcceleratorProfileTolerationsSection';
import { ManageAcceleratorSectionID } from './types';
import { ManageAcceleratorSectionTitles, ScrollableSelectorID } from './const';
import { ManageAcceleratorProfileDetailsSection } from './ManageAcceleratorProfileDetailsSection';

type ManageAcceleratorProfileProps = {
  existingAccelerator?: AcceleratorKind;
};

const ManageAcceleratorProfile: React.FC<ManageAcceleratorProfileProps> = ({
  existingAccelerator,
}) => {
  const [state, setState] = useGenericObjectState<AcceleratorKind['spec']>({
    displayName: '',
    identifier: '',
    enabled: true,
    tolerations: [],
  });

  React.useEffect(() => {
    if (existingAccelerator) {
      setState('displayName', existingAccelerator.spec.displayName);
      setState('identifier', existingAccelerator.spec.identifier);
      setState('description', existingAccelerator.spec.description);
      setState('enabled', existingAccelerator.spec.enabled);
      setState('tolerations', existingAccelerator.spec.tolerations);
    }
  }, [existingAccelerator, setState]);

  const sectionIDs = Object.values(ManageAcceleratorSectionID);

  return (
    <ApplicationsPage
      title={
        existingAccelerator
          ? `Edit ${existingAccelerator.spec.displayName}`
          : 'Create accelerator profile'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to="/acceleratorProfiles">Accelerator profiles</Link>}
          />
          <BreadcrumbItem>
            {existingAccelerator ? 'Edit' : 'Create'} accelerator profile
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection
        isFilled
        id={ScrollableSelectorID}
        aria-label="manage-accelerator-spawner-section"
        variant="light"
      >
        <GenericSidebar sections={sectionIDs} titles={ManageAcceleratorSectionTitles}>
          <Form style={{ maxWidth: 600 }}>
            <ManageAcceleratorProfileDetailsSection state={state} setState={setState} />
            <ManageAcceleratorProfileTolerationsSection
              tolerations={state.tolerations ?? []}
              setTolerations={(tolerations) => setState('tolerations', tolerations)}
            />
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <ManageAcceleratorProfileFooter state={state} existingAccelerator={existingAccelerator} />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ManageAcceleratorProfile;
