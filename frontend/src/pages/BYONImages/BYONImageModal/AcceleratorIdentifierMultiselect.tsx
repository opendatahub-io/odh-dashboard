import React, { useState } from 'react';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import useAccelerators from '~/pages/notebookController/screens/server/useAccelerators';
import { useDashboardNamespace } from '~/redux/selectors';

type AcceleratorIdentifierMultiselectProps = {
  data: string[];
  setData: (data: string[]) => void;
};

export const AcceleratorIdentifierMultiselect: React.FC<AcceleratorIdentifierMultiselectProps> = ({
  data,
  setData,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [accelerators, loaded, loadError] = useAccelerators(dashboardNamespace);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [newOptions, setNewOptions] = useState<string[]>([]);

  const options = React.useMemo(() => {
    if (loaded && !loadError) {
      const uniqueIdentifiers = new Set<string>();
      accelerators.forEach((accelerator) => {
        uniqueIdentifiers.add(accelerator.spec.identifier);
      });

      data.forEach((identifier) => {
        uniqueIdentifiers.add(identifier);
      });

      newOptions.forEach((option) => {
        uniqueIdentifiers.add(option);
      });
      return Array.from(uniqueIdentifiers);
    }
    return [];
  }, [accelerators, loaded, loadError, data, newOptions]);

  const clearSelection = () => {
    setData([]);
    setIsOpen(false);
  };

  return (
    <Select
      variant={SelectVariant.typeaheadMulti}
      typeAheadAriaLabel="Example, nvidia.com/gpu"
      onToggle={() => setIsOpen(!isOpen)}
      onSelect={(_, selection) => {
        if (data.includes(selection.toString())) {
          setData(data.filter((item) => item !== selection));
        } else {
          setData([...data, selection.toString()]);
        }
      }}
      {...(!loaded && !loadError && { loadingVariant: 'spinner' })}
      onClear={clearSelection}
      selections={data}
      isOpen={isOpen}
      placeholderText="Example, nvidia.com/gpu"
      isCreatable
      onCreateOption={(value) => {
        setNewOptions([...options, value]);
      }}
    >
      {options.map((option, i) => (
        <SelectOption key={option + i} value={option} />
      ))}
    </Select>
  );
};
