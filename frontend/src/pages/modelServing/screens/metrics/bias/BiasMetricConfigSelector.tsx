import React from 'react';
import {
  Select,
  SelectGroup,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
} from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { MetricTypes } from '~/api';
import { byId, byNotId } from '~/pages/modelServing/screens/metrics/utils';

type BiasMetricConfigSelector = {
  onChange?: (x: BiasMetricConfig[]) => void;
};

const BiasMetricConfigSelector: React.FC<BiasMetricConfigSelector> = ({ onChange }) => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BiasMetricConfigOption[]>([]);

  const elementId = React.useId();

  const changeState = React.useCallback(
    (options: BiasMetricConfigOption[]) => {
      setSelected(options);
      onChange && onChange(options.map((x) => x.asBiasMetricConfig()));
    },
    [onChange],
  );

  return (
    <>
      <span id={elementId} hidden>
        Select the metrics to display charts for
      </span>
      <Select
        variant={SelectVariant.typeaheadMulti}
        typeAheadAriaLabel="Select a metric"
        onToggle={() => setIsOpen(!isOpen)}
        onSelect={(event, item) => {
          if (isBiasMetricConfigOption(item)) {
            if (selected.find(byId(item))) {
              // User has de-selected an item.
              changeState([...selected.filter(byNotId(item))]);
            } else {
              // User has selected an item.
              changeState([...selected, item]);
            }
          }
        }}
        onClear={() => {
          changeState([]);
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

const isBiasMetricConfigOption = (obj: SelectOptionObject): obj is BiasMetricConfigOption =>
  'asBiasMetricConfig' in obj;

export default BiasMetricConfigSelector;
