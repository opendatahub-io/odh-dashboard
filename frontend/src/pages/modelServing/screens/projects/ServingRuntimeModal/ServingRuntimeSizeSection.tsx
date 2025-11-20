import * as React from 'react';
import { HardwareProfileKind, ServingRuntimeKind } from '#~/k8sTypes';
import { getCompatibleIdentifiers } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { ModelServingHardwareProfileState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import HardwareProfileFormSection from '#~/concepts/hardwareProfiles/HardwareProfileFormSection';
import { MODEL_SERVING_VISIBILITY } from '#~/concepts/hardwareProfiles/const';

type ServingRuntimeSizeSectionProps = {
  podSpecOptionState: ModelServingHardwareProfileState;
  projectName?: string;
  servingRuntimeSelected?: ServingRuntimeKind;
  isEditing?: boolean;
};

const ServingRuntimeSizeSection = ({
  podSpecOptionState,
  projectName,
  servingRuntimeSelected,
  isEditing = false,
}: ServingRuntimeSizeSectionProps): React.ReactNode => {
  const isHardwareProfileSupported = React.useCallback(
    (profile: HardwareProfileKind) => {
      if (!servingRuntimeSelected) {
        return false;
      }

      const compatibleIdentifiers = getCompatibleIdentifiers(servingRuntimeSelected);

      // if any of the identifiers in the image are included in the profile, return true
      return compatibleIdentifiers.some((imageIdentifier) =>
        profile.spec.identifiers?.some(
          (profileIdentifier) => profileIdentifier.identifier === imageIdentifier,
        ),
      );
    },
    [servingRuntimeSelected],
  );

  return (
    <>
      <HardwareProfileFormSection
        project={projectName}
        podSpecOptionsState={podSpecOptionState}
        isEditing={isEditing}
        isHardwareProfileSupported={isHardwareProfileSupported}
        visibleIn={MODEL_SERVING_VISIBILITY}
      />
    </>
  );
};

export default ServingRuntimeSizeSection;
