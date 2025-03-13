import * as React from 'react';
import { FormGroup, Stack, StackItem, ExpandableSection, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { HardwareProfileFeatureVisibility, HardwareProfileKind } from '~/k8sTypes';
import { ValidationContext } from '~/utilities/useValidation';
import { ContainerResources } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { HardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileCustomize from '~/concepts/hardwareProfiles/HardwareProfileCustomize';
import HardwareProfileSelect from '~/concepts/hardwareProfiles/HardwareProfileSelect';
import { filterHardwareProfilesForTraining } from '~/pages/pipelines/global/modelCustomization/utils';
import { useHardwareProfilesByFeatureVisibility } from '~/pages/hardwareProfiles/migration/useHardwareProfilesByFeatureVisibility';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

type TrainingHardwareProfileFormSectionProps = {
  data: HardwareProfileConfig;
  setData: UpdateObjectAtPropAndValue<HardwareProfileConfig>;
};

const TrainingHardwareProfileFormSection: React.FC<TrainingHardwareProfileFormSectionProps> = ({
  data,
  setData,
}) => {
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const hasValidationErrors =
    Object.keys(getAllValidationIssues(['hardware', 'hardwareProfileConfig'])).length > 0;

  const [isExpanded, setIsExpanded] = React.useState(hasValidationErrors);
  const [hardwareProfiles, loaded, error] = useHardwareProfilesByFeatureVisibility([
    HardwareProfileFeatureVisibility.PIPELINES,
  ]);

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
          label="Training hardware profile"
          isRequired
          labelHelp={
            <Popover
              bodyContent={
                <>
                  <p>
                    Hardware profiles enable administrators to create profiles for additional types
                    of identifiers, limit workload resource allocations, and target workloads to
                    specific nodes by including tolerations and nodeSelectors in profiles.
                  </p>
                  <br />
                  <p>This list includes only hardware profiles that have GPU defined.</p>
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
            isHardwareProfileSupported={() => false}
            hardwareProfiles={filteredHardwareProfiles}
            hardwareProfilesLoaded={loaded}
            hardwareProfilesError={error}
            hardwareProfileConfig={data}
            onChange={onProfileSelect}
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
