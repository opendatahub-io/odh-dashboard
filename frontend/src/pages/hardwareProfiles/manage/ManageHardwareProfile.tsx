import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Form, FormSection, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { HardwareProfileKind } from '~/k8sTypes';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import {
  DEFAULT_HARDWARE_PROFILE_SPEC,
  ManageHardwareProfileSectionTitles,
} from '~/pages/hardwareProfiles/const';
import ManageNodeSelectorSection from '~/pages/hardwareProfiles/manage/ManageNodeSelectorSection';
import ManageTolerationSection from '~/pages/hardwareProfiles/manage/ManageTolerationSection';
import ManageHardwareProfileFooter from '~/pages/hardwareProfiles/manage/ManageHardwareProfileFooter';
import ManageNodeResourceSection from '~/pages/hardwareProfiles/manage/ManageNodeResourceSection';
import { HardwareProfileFormData, ManageHardwareProfileSectionID } from './types';

type ManageHardwareProfileProps = {
  existingHardwareProfile?: HardwareProfileKind;
  duplicatedHardwareProfile?: HardwareProfileKind;
  contextPath?: string;
  homepageTitle?: string;
};

const ManageHardwareProfile: React.FC<ManageHardwareProfileProps> = ({
  existingHardwareProfile,
  duplicatedHardwareProfile,
  contextPath = '/hardwareProfiles',
  homepageTitle = 'Hardware profiles',
}) => {
  const [state, setState] = useGenericObjectState<HardwareProfileKind['spec']>(
    DEFAULT_HARDWARE_PROFILE_SPEC,
  );
  const { data: profileNameDesc, onDataChange: setProfileNameDesc } =
    useK8sNameDescriptionFieldData({
      initialData: existingHardwareProfile
        ? {
            name: existingHardwareProfile.spec.displayName,
            k8sName: existingHardwareProfile.metadata.name,
            description: existingHardwareProfile.spec.description,
          }
        : undefined,
    });

  React.useEffect(() => {
    if (existingHardwareProfile) {
      setState('identifiers', existingHardwareProfile.spec.identifiers);
      setState('enabled', existingHardwareProfile.spec.enabled);
      setState('nodeSelector', existingHardwareProfile.spec.nodeSelector);
      setState('tolerations', existingHardwareProfile.spec.tolerations);
    }
  }, [existingHardwareProfile, setState]);

  React.useEffect(() => {
    if (duplicatedHardwareProfile) {
      setState('identifiers', duplicatedHardwareProfile.spec.identifiers);
      setState('enabled', duplicatedHardwareProfile.spec.enabled);
      setState('nodeSelector', duplicatedHardwareProfile.spec.nodeSelector);
      setState('tolerations', duplicatedHardwareProfile.spec.tolerations);
    }
  }, [duplicatedHardwareProfile, setState]);

  const formState: HardwareProfileFormData = React.useMemo(
    () => ({
      ...state,
      name: profileNameDesc.k8sName.value,
      displayName: profileNameDesc.name.trim(),
      description: profileNameDesc.description,
    }),
    [state, profileNameDesc],
  );

  const validFormData = isK8sNameDescriptionDataValid(profileNameDesc);

  return (
    <ApplicationsPage
      title={
        existingHardwareProfile
          ? `Edit ${existingHardwareProfile.spec.displayName}`
          : duplicatedHardwareProfile
          ? `Duplicate ${duplicatedHardwareProfile.spec.displayName}`
          : 'Create hardware profile'
      }
      description={
        duplicatedHardwareProfile
          ? 'Create a new, editable profile by duplicating an existing profile.'
          : 'A hardware profile allows you to target notebook and model deployment workloads to particular cluster nodes by allowing you to specify node resources, node selectors and tolerations.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={contextPath}>{homepageTitle}</Link>} />
          <BreadcrumbItem isActive>
            {existingHardwareProfile ? 'Edit' : duplicatedHardwareProfile ? 'Duplicate' : 'Create'}{' '}
            hardware profile
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection
        hasBodyWrapper={false}
        isFilled
        aria-label="manage-hardware-profile-spawner-section"
      >
        <Form>
          <FormSection
            id={ManageHardwareProfileSectionID.DETAILS}
            aria-label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.DETAILS]}
            title={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.DETAILS]}
          >
            <K8sNameDescriptionField
              data={profileNameDesc}
              onDataChange={setProfileNameDesc}
              dataTestId="hardware-profile-name-desc"
            />
          </FormSection>
          <ManageNodeResourceSection
            nodeResources={state.identifiers ?? []}
            setNodeResources={(identifiers) => setState('identifiers', identifiers)}
          />
          <ManageNodeSelectorSection
            nodeSelector={state.nodeSelector ?? {}}
            setNodeSelector={(nodeSelector) => setState('nodeSelector', nodeSelector)}
          />
          <ManageTolerationSection
            tolerations={state.tolerations ?? []}
            setTolerations={(tolerations) => setState('tolerations', tolerations)}
          />
        </Form>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <ManageHardwareProfileFooter
          state={formState}
          existingHardwareProfile={existingHardwareProfile}
          validFormData={validFormData}
          redirectPath={contextPath}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ManageHardwareProfile;
