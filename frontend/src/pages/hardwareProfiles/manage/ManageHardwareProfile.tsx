import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Form, FormSection, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import { HardwareProfileKind } from '#~/k8sTypes';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  DEFAULT_HARDWARE_PROFILE_FORM_DATA,
  ManageHardwareProfileSectionTitles,
} from '#~/pages/hardwareProfiles/const';
import {
  getHardwareProfileDescription,
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
} from '#~/pages/hardwareProfiles/utils';
import ManageHardwareProfileFooter from '#~/pages/hardwareProfiles/manage/ManageHardwareProfileFooter';
import ManageNodeResourceSection from '#~/pages/hardwareProfiles/manage/ManageNodeResourceSection';
import { MigrationAction } from '#~/pages/hardwareProfiles/migration/types';
import { useValidation, ValidationContext } from '#~/utilities/useValidation';
import ManageResourceAllocationSection from '#~/pages/hardwareProfiles/manage/ManageResourceAllocationSection.tsx';
import { SchedulingType } from '#~/types.ts';
import { manageHardwareProfileValidationSchema } from './validationUtils';
import { HardwareProfileVisibilitySection } from './HardwareProfileVisibilitySection';
import { HardwareProfileFormData, ManageHardwareProfileSectionID } from './types';

type ManageHardwareProfileProps = {
  existingHardwareProfile?: HardwareProfileKind;
  duplicatedHardwareProfile?: HardwareProfileKind;
  contextPath?: string;
  homepageTitle?: string;
  migrationAction?: MigrationAction;
};

const ManageHardwareProfile: React.FC<ManageHardwareProfileProps> = ({
  existingHardwareProfile,
  duplicatedHardwareProfile,
  contextPath = '/hardwareProfiles',
  homepageTitle = 'Hardware profiles',
  migrationAction,
}) => {
  const [state, setState] = useGenericObjectState<HardwareProfileFormData>(
    DEFAULT_HARDWARE_PROFILE_FORM_DATA,
  );
  const [visibility, setVisibility] = React.useState<string[]>([]);
  const { data: profileNameDesc, onDataChange: setProfileNameDesc } =
    useK8sNameDescriptionFieldData({
      initialData: existingHardwareProfile
        ? {
            name: getHardwareProfileDisplayName(existingHardwareProfile),
            k8sName: existingHardwareProfile.metadata.name,
            description: getHardwareProfileDescription(existingHardwareProfile) ?? '',
          }
        : undefined,
    });

  const prefillFormData = React.useCallback(
    (hardwareProfile?: HardwareProfileKind) => {
      if (hardwareProfile) {
        setState('identifiers', hardwareProfile.spec.identifiers);
        setState('enabled', isHardwareProfileEnabled(hardwareProfile));
        if (hardwareProfile.spec.scheduling) {
          setState('scheduling', hardwareProfile.spec.scheduling);
        }

        // set the visibility from the annotations
        try {
          if (
            hardwareProfile.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility']
          ) {
            const visibleIn = JSON.parse(
              hardwareProfile.metadata.annotations['opendatahub.io/dashboard-feature-visibility'],
            );
            setVisibility(visibleIn);
          } else {
            setVisibility([]);
          }
        } catch (error) {
          setVisibility([]);
        }
      }
    },
    [setState],
  );

  React.useEffect(() => {
    prefillFormData(existingHardwareProfile);
  }, [existingHardwareProfile, prefillFormData]);

  React.useEffect(() => {
    prefillFormData(duplicatedHardwareProfile);
  }, [duplicatedHardwareProfile, prefillFormData]);

  const formState: HardwareProfileFormData = React.useMemo(() => {
    const { scheduling, ...rest } = state;
    const { type: schedulingType, kueue, node } = scheduling ?? {};
    return {
      ...rest,
      name: profileNameDesc.k8sName.value,
      displayName: profileNameDesc.name.trim(),
      description: profileNameDesc.description,
      visibility,
      scheduling: schedulingType
        ? schedulingType === SchedulingType.QUEUE
          ? { type: SchedulingType.QUEUE, kueue }
          : { type: SchedulingType.NODE, node }
        : undefined,
    };
  }, [state, profileNameDesc, visibility]);

  const validation = useValidation(formState, manageHardwareProfileValidationSchema);

  return (
    <ValidationContext.Provider value={validation}>
      <ApplicationsPage
        title={
          existingHardwareProfile
            ? `Edit ${getHardwareProfileDisplayName(existingHardwareProfile)}`
            : duplicatedHardwareProfile
            ? `Duplicate ${getHardwareProfileDisplayName(duplicatedHardwareProfile)}`
            : 'Create hardware profile'
        }
        description={
          duplicatedHardwareProfile
            ? 'Create a new, editable profile by duplicating an existing profile.'
            : 'Configure a new hardware profile to either determine resource allocation strategies for specific workloads or to explicitly define hardware configurations for users.'
        }
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem render={() => <Link to={contextPath}>{homepageTitle}</Link>} />
            <BreadcrumbItem isActive>
              {existingHardwareProfile
                ? 'Edit'
                : duplicatedHardwareProfile
                ? 'Duplicate'
                : 'Create'}{' '}
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
              aria-label={
                ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.DETAILS]
              }
              title={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.DETAILS]}
            >
              <K8sNameDescriptionField
                data={profileNameDesc}
                onDataChange={setProfileNameDesc}
                dataTestId="hardware-profile-name-desc"
              />
            </FormSection>
            <HardwareProfileVisibilitySection
              visibility={visibility}
              setVisibility={setVisibility}
            />
            <ManageNodeResourceSection
              nodeResources={state.identifiers ?? []}
              setNodeResources={(identifiers) => setState('identifiers', identifiers)}
            />
            <ManageResourceAllocationSection
              scheduling={state.scheduling}
              setScheduling={(updated) => setState('scheduling', updated)}
              existingType={existingHardwareProfile?.spec.scheduling?.type}
            />
          </Form>
        </PageSection>
        <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
          <ManageHardwareProfileFooter
            state={formState}
            existingHardwareProfile={existingHardwareProfile}
            validFormData={validation.validationResult.success}
            redirectPath={contextPath}
            migrationAction={migrationAction}
          />
        </PageSection>
      </ApplicationsPage>
    </ValidationContext.Provider>
  );
};
export default ManageHardwareProfile;
