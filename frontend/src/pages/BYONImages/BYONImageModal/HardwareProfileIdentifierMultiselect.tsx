import React from 'react';
import { MultiSelection } from '#~/components/MultiSelection';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/migration/useHardwareProfilesByFeatureVisibility';

type HardwareProfileIdentifierMultiselectProps = {
  data: string[];
  setData: (data: string[]) => void;
};

export const HardwareProfileIdentifierMultiselect: React.FC<
  HardwareProfileIdentifierMultiselectProps
> = ({ data, setData }) => {
  const [hardwareProfiles] = useHardwareProfilesByFeatureVisibility([
    HardwareProfileFeatureVisibility.WORKBENCH,
  ]);

  const identifiers = React.useMemo(() => {
    const uniqueIdentifiers = new Set<string>(data);

    // Add identifiers from hardware profiles
    hardwareProfiles.forEach((cr) =>
      cr.spec.identifiers?.forEach((i) => uniqueIdentifiers.add(i.identifier)),
    );

    // Don't return preset identifiers
    // We still allow users to select custom CPU and Memory identifiers here
    return Array.from(uniqueIdentifiers).filter(
      (identifier) => identifier !== 'cpu' && identifier !== 'memory',
    );
  }, [hardwareProfiles, data]);

  return (
    <MultiSelection
      ariaLabel="Hardware Profile Identifier Select"
      value={identifiers.map((identifier) => ({
        id: identifier,
        name: identifier,
        selected: data.includes(identifier),
      }))}
      setValue={(newState) => setData(newState.filter((n) => n.selected).map((n) => String(n.id)))}
      placeholder="Example, nvidia.com/gpu"
      toggleTestId="hardware-profile-identifier-multiselect"
      isCreatable
      createOptionMessage={(newValue) => `Create new option "${newValue}"`}
    />
  );
};
