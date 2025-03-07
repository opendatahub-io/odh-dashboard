import * as React from 'react';
import {
  FormGroup,
  Stack,
  StackItem,
  ExpandableSection,
  Popover,
  Button,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { HardwareProfileKind } from '~/k8sTypes';
import { ValidationContext } from '~/utilities/useValidation';
import { ContainerResources } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { HardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileCustomize from '~/concepts/hardwareProfiles/HardwareProfileCustomize';
import HardwareProfileSelect from '~/concepts/hardwareProfiles/HardwareProfileSelect';
import { useDashboardNamespace } from '~/redux/selectors';
import useHardwareProfiles from '~/pages/hardwareProfiles/useHardwareProfiles';
import { filterHardwareProfilesForTraining } from '~/pages/pipelines/global/modelCustomization/utils';
import { SimpleSelectOption } from '~/components/SimpleSelect';

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
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles, loaded, error] = useHardwareProfiles(dashboardNamespace);

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

  const selectionOptions = React.useMemo(() => {
    const enabledProfiles = filteredHardwareProfiles.filter((hp) => hp.spec.enabled);

    const formattedOptions: SimpleSelectOption[] = enabledProfiles.map((profile) => {
      const displayName = `${profile.spec.displayName}${
        !profile.spec.enabled ? ' (disabled)' : ''
      }`;
      const identifierDescriptions = profile.spec.identifiers
        ?.map((identifier) => {
          const { defaultCount } = identifier;

          return `${identifier.identifier}: Request=${defaultCount}, Limit=${defaultCount}`;
        })
        .join('; ');

      const tolerationDescriptions = profile.spec.tolerations
        ?.map(({ key, value }) => `${key}:${value ?? 'null'}`)
        .join('; ');

      // Format nodeSelector information
      const nodeSelectorDescriptions = Object.entries(profile.spec.nodeSelector ?? {})
        .map(([key, value]) => `${key}:${value}`)
        .join('; ');

      return {
        key: profile.metadata.name,
        label: displayName,
        description: (
          <Split>
            <SplitItem>{identifierDescriptions}</SplitItem>
            <SplitItem>
              {tolerationDescriptions && `tolerations: ${tolerationDescriptions}`}
            </SplitItem>
            <SplitItem>
              {Object.keys(profile.spec.nodeSelector ?? {}).length
                ? `nodeSelector: ${nodeSelectorDescriptions}`
                : ''}
            </SplitItem>
          </Split>
        ),
      };
    });

    return formattedOptions;
  }, [filteredHardwareProfiles]);

  return (
    <Stack hasGutter data-testid="hardware-profile-section">
      <StackItem>
        <FormGroup label="Training hardware profile" isRequired>
          <HardwareProfileSelect
            allowExistingSettings={false}
            selectOptions={selectionOptions}
            isHardwareProfileSupported={() => false}
            hardwareProfiles={filteredHardwareProfiles}
            hardwareProfilesLoaded={loaded}
            hardwareProfilesError={error}
            hardwareProfileConfig={data}
            onChange={onProfileSelect}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <Popover
          hasAutoWidth
          bodyContent="This list includes only the hardware profiles that have GPU defined."
        >
          <Button
            variant="link"
            icon={<OutlinedQuestionCircleIcon />}
            data-testid="hardware-profile-details-popover"
          >
            Not seeing what you&apos;re looking for?
          </Button>
        </Popover>
      </StackItem>
      {data.selectedProfile?.spec.identifiers &&
        data.selectedProfile.spec.identifiers.length > 0 && (
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
