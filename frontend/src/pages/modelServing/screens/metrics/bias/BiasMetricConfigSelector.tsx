import React from 'react';
import { Select, SelectGroup, SelectOption, SelectVariant } from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { MetricTypes } from '~/api';
// import { byId } from '~/pages/modelServing/screens/metrics/bias/BiasTab';

type BiasMetricConfigSelector = {
  onChange?: (x: BiasMetricConfig[]) => void;
};

const BiasMetricConfigSelector: React.FC<BiasMetricConfigSelector> = ({ onChange }) => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BiasMetricConfigOption[]>([]);

  const elementId = React.useId();

  //TODO  * remove logging statements
  //      * inline function
  const onSelect = (event, selection) => {
    if (selected.findIndex((x) => x.id === selection.id) < 0) {
      // User has selected an item
      setSelected([...selected, selection]);
      // eslint-disable-next-line no-console
      console.log('New item selected: item: %O - selections: %O', selection, selected);
    } else {
      // User has de-selected an item
      // eslint-disable-next-line no-console
      console.log('Removing item: %O', selection);
      setSelected([...selected.filter((x) => x.id !== selection.id)]);
    }
    if (onChange) {
      onChange(selected.map((x) => x.asBiasMetricConfig()));
    }
  };

  // const doSelect = React.useCallback(
  //   (event, selection: BiasMetricConfigOption) => {
  //     if (selected.find(byId(selection))) {
  //       // User has selected an item
  //       setSelected([...selected, selection]);
  //       // eslint-disable-next-line no-console
  //       console.log('New item selected: item: %O - selections: %O', selection, selected);
  //     } else {
  //       // User has de-selected an item
  //       // eslint-disable-next-line no-console
  //       console.log('Removing item: %O', selection);
  //       setSelected([...selected.filter((x) => x.id !== selection.id)]);
  //     }
  //     if (onChange) {
  //       onChange(selected.map((x) => x.asBiasMetricConfig()));
  //     }
  //   },
  //   [onChange, selected],
  // );

  return (
    <>
      <span id={elementId} hidden>
        Select the metrics to display charts for
      </span>
      <Select
        variant={SelectVariant.typeaheadMulti}
        typeAheadAriaLabel="Select a metric"
        onToggle={() => setIsOpen(!isOpen)}
        onSelect={doSelect}
        onClear={() => {
          setSelected([]);
          setIsOpen(false);
        }}
        selections={selected}
        isOpen={isOpen}
        aria-labelledby={elementId}
        placeholderText="Select a metric"
        isDisabled={!loaded}
        isGrouped={true}
      >
        <SelectGroup label="SPD" key="SPD">
          {biasMetricConfigs
            .filter((x) => x.metricType === MetricTypes.SPD)
            .map((x) => (
              <SelectOption key={x.id} value={createOption(x)} />
            ))}
        </SelectGroup>
        <SelectGroup label="DIR" key="DIR">
          {biasMetricConfigs
            .filter((x) => x.metricType === MetricTypes.DIR)
            .map((x) => (
              <SelectOption key={x.id} value={createOption(x)} />
            ))}
        </SelectGroup>
      </Select>
    </>
  );
};
export default BiasMetricConfigSelector;

type BiasMetricConfigOption = {
  id: string;
  name: string;
  asBiasMetricConfig: () => BiasMetricConfig;
  toString: () => string;
  compareTo: (x: BiasMetricConfigOption) => boolean;
};
const createOption = (biasMetricConfig: BiasMetricConfig): BiasMetricConfigOption => {
  const { id, name } = biasMetricConfig;
  return {
    id,
    name,
    asBiasMetricConfig: () => biasMetricConfig,
    toString: () => name,
    compareTo: (x) => x.id === id,
  };
};
