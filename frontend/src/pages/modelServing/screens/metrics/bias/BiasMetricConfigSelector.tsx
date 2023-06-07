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
  initialSelections?: BiasMetricConfig[];
};

const BiasMetricConfigSelector: React.FC<BiasMetricConfigSelector> = ({
  onChange,
  initialSelections,
}) => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BiasSelectOption[]>(() => {
    if (initialSelections) {
      return initialSelections.map(createBiasSelectOption);
    }
    return [];
  });

  const elementId = React.useId();

  const changeState = React.useCallback(
    (options: BiasSelectOption[]) => {
      setSelected(options);
      onChange && onChange(options.map((x) => x.biasMetricConfig));
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
          if (isBiasSelectOption(item)) {
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
              <SelectOption key={x.id} value={createBiasSelectOption(x)} />
            ))}
        </SelectGroup>
        <SelectGroup label="DIR" key="DIR">
          {biasMetricConfigs
            .filter((x) => x.metricType === MetricTypes.DIR)
            .map((x) => (
              <SelectOption key={x.id} value={createBiasSelectOption(x)} />
            ))}
        </SelectGroup>
      </Select>
    </>
  );
};

type BiasSelectOption = {
  id: string;
  name: string;
  biasMetricConfig: BiasMetricConfig;
  toString: () => string;
  compareTo: (x: BiasSelectOption) => boolean;
};
const createBiasSelectOption = (biasMetricConfig: BiasMetricConfig): BiasSelectOption => {
  const { id, name } = biasMetricConfig;
  return {
    id,
    name,
    biasMetricConfig,
    toString: () => name,
    compareTo: byId(id),
  };
};

const isBiasSelectOption = (obj: SelectOptionObject): obj is BiasSelectOption =>
  'biasMetricConfig' in obj;

export default BiasMetricConfigSelector;
