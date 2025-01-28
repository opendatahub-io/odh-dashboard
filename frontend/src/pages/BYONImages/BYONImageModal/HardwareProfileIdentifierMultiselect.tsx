import React from 'react';
import { useDashboardNamespace } from '~/redux/selectors';
import { MultiSelection } from '~/components/MultiSelection';
import useHardwareProfiles from '~/pages/hardwareProfiles/useHardwareProfiles';

type HardwareProfileIdentifierMultiselectProps = {
  data: string[];
  setData: (data: string[]) => void;
};

export const HardwareProfileIdentifierMultiselect: React.FC<
  HardwareProfileIdentifierMultiselectProps
> = ({ data, setData }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles] = useHardwareProfiles(dashboardNamespace);

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
      isCreatable
      createOptionMessage={(newValue) => `Create new option "${newValue}"`}
    />
  );
};
