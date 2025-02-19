import * as React from 'react';
import { FormGroup, Stack, StackItem, ExpandableSection } from '@patternfly/react-core';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '~/k8sTypes';
import { useValidation, ValidationContext } from '~/utilities/useValidation';
import { ContainerResources } from '~/types';
import { createHardwareProfileValidationSchema } from './validationUtils';
import HardwareProfileSelect from './HardwareProfileSelect';
import HardwareProfileCustomize from './HardwareProfileCustomize';
import { PodSpecOptionsState, PodSpecOptions } from './types';
import { getContainerResourcesFromHardwareProfile } from './utils';

type HardwareProfileFormSectionProps<T extends PodSpecOptions> = {
  isEditing: boolean;
  visibleIn?: HardwareProfileFeatureVisibility[];
  podSpecOptionsState: PodSpecOptionsState<T>;
  isHardwareProfileSupported?: (profile: HardwareProfileKind) => boolean;
};

const HardwareProfileFormSection: React.FC<HardwareProfileFormSectionProps<PodSpecOptions>> = ({
  podSpecOptionsState,
  isEditing,
  visibleIn = [],
  isHardwareProfileSupported = () => false,
}) => {
  const {
    hardwareProfile: { formData, initialHardwareProfile, setFormData },
    podSpecOptions,
  } = podSpecOptionsState;

  const validationSchema = React.useMemo(
    () => createHardwareProfileValidationSchema(formData.selectedProfile),
    [formData.selectedProfile],
  );

  const validation = useValidation(formData, validationSchema);
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
      setFormData('selectedProfile', undefined);
      setFormData('useExistingSettings', true);
      return;
    }

    // Reset customization when changing profiles
    const newResources = getContainerResourcesFromHardwareProfile(profile);

    setFormData('selectedProfile', profile);
    setFormData('useExistingSettings', false);
    setFormData('resources', newResources);
  };

  return (
    <ValidationContext.Provider value={validation}>
      <Stack hasGutter data-testid="hardware-profile-section">
        <StackItem>
          <FormGroup label="Hardware profile" isRequired>
            <HardwareProfileSelect
              hardwareProfileConfig={formData}
              visibleIn={visibleIn}
              isHardwareProfileSupported={isHardwareProfileSupported}
              initialHardwareProfile={initialHardwareProfile}
              podSpecOptions={podSpecOptions}
              onChange={onProfileSelect}
              allowExistingSettings={isEditing && !initialHardwareProfile}
            />
          </FormGroup>
        </StackItem>
        {formData.selectedProfile?.spec.identifiers &&
          formData.selectedProfile.spec.identifiers.length > 0 &&
          formData.resources && (
            <StackItem>
              <ExpandableSection
                isIndented
                toggleText="Customize resource requests and limits"
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
                data-testid="hardware-profile-customize"
              >
                <HardwareProfileCustomize
                  identifiers={formData.selectedProfile.spec.identifiers}
                  data={formData.resources}
                  setData={(newData: ContainerResources) => setFormData('resources', newData)}
                />
              </ExpandableSection>
            </StackItem>
          )}
      </Stack>
    </ValidationContext.Provider>
  );
};

export default HardwareProfileFormSection;
