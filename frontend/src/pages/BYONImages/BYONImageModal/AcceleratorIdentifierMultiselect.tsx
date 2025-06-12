import React from 'react';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import { MultiSelection } from '#~/components/MultiSelection';

type AcceleratorIdentifierMultiselectProps = {
  data: string[];
  setData: (data: string[]) => void;
};

export const AcceleratorIdentifierMultiselect: React.FC<AcceleratorIdentifierMultiselectProps> = ({
  data,
  setData,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [acceleratorProfiles] = useAcceleratorProfiles(dashboardNamespace);

  const identifiers = React.useMemo(() => {
    const uniqueIdentifiers = new Set<string>(data);

    // Add identifiers from accelerators
    acceleratorProfiles.forEach((cr) => {
      uniqueIdentifiers.add(cr.spec.identifier);
    });

    return Array.from(uniqueIdentifiers);
  }, [acceleratorProfiles, data]);

  return (
    <MultiSelection
      ariaLabel="Accelerator Identifier Select"
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
