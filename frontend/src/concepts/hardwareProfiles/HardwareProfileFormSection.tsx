import * as React from 'react';
import { FormGroup, Stack, StackItem, ExpandableSection } from '@patternfly/react-core';
import { HardwareProfileKind } from '~/k8sTypes';
import { useValidation, ValidationContext } from '~/utilities/useValidation';
import { ContainerResources } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { createHardwareProfileValidationSchema } from './validationUtils';
import HardwareProfileSelect from './HardwareProfileSelect';
import HardwareProfileCustomize from './HardwareProfileCustomize';
import { HardwareProfileConfig } from './useHardwareProfileConfig';

type HardwareProfileFormSectionProps = {
  data: HardwareProfileConfig;
  initialHardwareProfile?: HardwareProfileKind;
  allowExistingSettings?: boolean;
  setData: UpdateObjectAtPropAndValue<HardwareProfileConfig>;
  isHardwareProfileSupported?: (profile: HardwareProfileKind) => boolean;
};

const HardwareProfileFormSection: React.FC<HardwareProfileFormSectionProps> = ({
  data,
  initialHardwareProfile,
  allowExistingSettings = false,
  setData,
  isHardwareProfileSupported = () => false,
}) => {
  const validationSchema = React.useMemo(
    () => createHardwareProfileValidationSchema(data.selectedProfile),
    [data.selectedProfile],
  );

  const validation = useValidation(data, validationSchema);
  const hasValidationErrors = Object.keys(validation.getAllValidationIssues()).length > 0;

  const [isExpanded, setIsExpanded] = React.useState(hasValidationErrors);

  React.useEffect(() => {
    if (initialHardwareProfile && hasValidationErrors) {
      setIsExpanded(true);
    }
  }, [initialHardwareProfile, hasValidationErrors]);

  const onProfileSelect = (profile?: HardwareProfileKind) => {
    // if no profile provided, use existing settings
    if (!profile) {
      setData('selectedProfile', undefined);
      setData('useExistingSettings', true);
      return;
    }

    // Reset customization when changing profiles
    const emptyRecord: Record<string, string | number> = {};

    const newRequests =
      profile.spec.identifiers?.reduce(
        (acc: Record<string, string | number>, identifier) => {
          acc[identifier.identifier] = identifier.defaultCount;
          return acc;
        },
        { ...emptyRecord },
      ) ?? emptyRecord;

    const newLimits =
      profile.spec.identifiers?.reduce(
        (acc: Record<string, string | number>, identifier) => {
          acc[identifier.identifier] = identifier.defaultCount;
          return acc;
        },
        { ...emptyRecord },
      ) ?? emptyRecord;

    setData('selectedProfile', profile);
    setData('useExistingSettings', false);
    setData('resources', {
      requests: newRequests,
      limits: newLimits,
    });
  };

  return (
    <ValidationContext.Provider value={validation}>
      <Stack hasGutter data-testid="hardware-profile-section">
        <StackItem>
          <FormGroup label="Hardware profile">
            <HardwareProfileSelect
              isHardwareProfileSupported={isHardwareProfileSupported}
              hardwareProfileConfig={data}
              initialHardwareProfile={initialHardwareProfile}
              onChange={onProfileSelect}
              allowExistingSettings={allowExistingSettings}
            />
          </FormGroup>
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
                  identifiers={data.selectedProfile.spec.identifiers}
                  data={data.resources}
                  setData={(newData: ContainerResources) => setData('resources', newData)}
                />
              </ExpandableSection>
            </StackItem>
          )}
      </Stack>
    </ValidationContext.Provider>
  );
};

export default HardwareProfileFormSection;
