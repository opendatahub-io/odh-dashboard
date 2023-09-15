import React from 'react';
import { Select, SelectGroup, SelectOption, SelectVariant } from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { BiasMetricType } from '~/api';
import {
  byId,
  byNotId,
  createBiasSelectOption,
  isBiasSelectOption,
} from '~/pages/modelServing/screens/metrics/utils';
import { BiasSelectOption } from '~/pages/modelServing/screens/metrics/types';

type BiasMetricConfigSelectorProps = {
  onChange: (x: BiasMetricConfig[]) => void;
  initialSelections: BiasMetricConfig[];
};

const BiasMetricConfigSelector: React.FC<BiasMetricConfigSelectorProps> = ({
  onChange,
  initialSelections,
}) => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();

  const [isOpen, setIsOpen] = React.useState(false);

  const selected = React.useMemo(
    () => initialSelections.map(createBiasSelectOption),
    [initialSelections],
  );

  const elementId = React.useId();

  const changeState = React.useCallback(
    (options: BiasSelectOption[]) => {
      onChange(options.map((x) => x.biasMetricConfig));
    },
    [onChange],
  );

  return (
    <div style={{ maxWidth: '600px' }}>
      <span id={elementId} hidden>
        Select the metrics to display charts for
      </span>
      <Select
        variant={SelectVariant.typeaheadMulti}
        typeAheadAriaLabel="Select a metric"
        onToggle={setIsOpen}
        onSelect={(event, item) => {
          if (isBiasSelectOption(item)) {
            if (selected.find(byId(item))) {
              // User has de-selected an item.
              changeState(selected.filter(byNotId(item)));
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
        isDisabled={!(loaded && biasMetricConfigs.length > 0)}
        isGrouped
      >
        <SelectGroup label="SPD" key="SPD">
          {biasMetricConfigs
            .filter((x) => x.metricType === BiasMetricType.SPD)
            .map((x) => (
              <SelectOption key={x.id} value={createBiasSelectOption(x)} />
            ))}
        </SelectGroup>
        <SelectGroup label="DIR" key="DIR">
          {biasMetricConfigs
            .filter((x) => x.metricType === BiasMetricType.DIR)
            .map((x) => (
              <SelectOption key={x.id} value={createBiasSelectOption(x)} />
            ))}
        </SelectGroup>
      </Select>
    </div>
  );
};

export default BiasMetricConfigSelector;
