import * as React from 'react';
import {
  FormGroup,
  Stack,
  StackItem,
  ExpandableSection,
  Popover,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { HardwareProfileFeatureVisibility, HardwareProfileKind } from '#~/k8sTypes';
import { ContainerResources } from '#~/types';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { HardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileCustomize from '#~/concepts/hardwareProfiles/HardwareProfileCustomize';
import HardwareProfileSelect from '#~/concepts/hardwareProfiles/HardwareProfileSelect';
import { filterHardwareProfilesForTraining } from '#~/pages/pipelines/global/modelCustomization/utils';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/migration/useHardwareProfilesByFeatureVisibility';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { useApplicationSettings } from '#~/app/useApplicationSettings';

type TrainingHardwareProfileFormSectionProps = {
  data: HardwareProfileConfig;
  setData: UpdateObjectAtPropAndValue<HardwareProfileConfig>;
  projectName: string;
};

const TrainingHardwareProfileFormSection: React.FC<TrainingHardwareProfileFormSectionProps> = ({
  data,
  setData,
  projectName,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hardwareProfiles, loaded, error] = useHardwareProfilesByFeatureVisibility([
    HardwareProfileFeatureVisibility.PIPELINES,
  ]);
  const projectScopedHardwareProfiles = useHardwareProfilesByFeatureVisibility(
    [HardwareProfileFeatureVisibility.PIPELINES],
    projectName,
  );
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const { dashboardConfig } = useApplicationSettings();
  const hardwareProfileOrder = dashboardConfig?.spec.hardwareProfileOrder || [];

  const onProfileSelect = (profile?: HardwareProfileKind) => {
    if (profile) {
      const emptyRecord: Record<string, string | number> = {};

      const newRequests =
        profile.spec.identifiers?.reduce(
          (acc: Record<string, string | number>, identifier) => {
            acc[identifier.identifier] = identifier.defaultCount;
            return acc;
          },
          { ...emptyRecord },
        ) ?? emptyRecord;

      setData('selectedProfile', profile);
      setData('resources', {
        limits: newRequests,
        requests: newRequests,
      });
    }
  };

  const filteredHardwareProfiles = React.useMemo(
    () => filterHardwareProfilesForTraining(hardwareProfiles),
    [hardwareProfiles],
  );

  return (
    <Stack hasGutter data-testid="hardware-profile-section">
      <StackItem>
        <FormGroup
          label="Hardware profile"
          isRequired
          labelHelp={
            <Popover
              bodyContent={
                <>
                  <Content component={ContentVariants.p}>
                    This list includes only hardware profiles with defined GPUs.
                  </Content>
                  {isProjectScoped &&
                    projectScopedHardwareProfiles['1'] &&
                    projectScopedHardwareProfiles['0'].length > 0 && (
                      <Content component={ContentVariants.ul}>
                        <Content component={ContentVariants.li}>
                          <b>Project-scoped hardware profiles</b> are accessible only within this
                          project.
                        </Content>
                        <Content component={ContentVariants.li}>
                          <b>Global-scoped hardware profiles</b> are accessible within all projects.
                        </Content>
                      </Content>
                    )}
                  <Content component={ContentVariants.p}>
                    Hardware profiles enable administrators to create profiles for additional types
                    of identifiers, limit workload resource allocations, and target workloads to
                    specific nodes by including tolerations and nodeSelectors in profiles.
                  </Content>
                </>
              }
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          }
        >
          <HardwareProfileSelect
            allowExistingSettings={false}
            isProjectScoped={isProjectScoped}
            isHardwareProfileSupported={() => false}
            hardwareProfiles={filteredHardwareProfiles}
            hardwareProfilesLoaded={loaded}
            hardwareProfilesError={error}
            hardwareProfileConfig={data}
            onChange={onProfileSelect}
            projectScopedHardwareProfiles={projectScopedHardwareProfiles}
            project={projectName}
            hardwareProfileOrder={hardwareProfileOrder}
          />
        </FormGroup>
      </StackItem>
      {data.selectedProfile?.spec.identifiers &&
        data.selectedProfile.spec.identifiers.length > 0 &&
        data.resources && (
          <StackItem>
            <ExpandableSection
              isIndented
              toggleText="Customize resource requests and limits"
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
              data-testid="hardware-profile-customize"
            >
              <HardwareProfileCustomize
                hardwareValidationPath={['hardware', 'hardwareProfileConfig']}
                hideLimitOption
                identifiers={data.selectedProfile.spec.identifiers}
                data={data.resources}
                setData={(newData: ContainerResources) => setData('resources', newData)}
              />
            </ExpandableSection>
          </StackItem>
        )}
    </Stack>
  );
};

export default TrainingHardwareProfileFormSection;
