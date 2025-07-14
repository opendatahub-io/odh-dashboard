import React from 'react';
import { useModelBiasData } from '#~/concepts/trustyai/context/useModelBiasData';
import { BiasMetricConfig, TrustyInstallState } from '#~/concepts/trustyai/types';
import { BiasMetricType } from '#~/api';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';

type BiasMetricConfigSelectorProps = {
  onChange: (x: BiasMetricConfig[]) => void;
  initialSelections: BiasMetricConfig[];
};

const BiasMetricConfigSelector: React.FC<BiasMetricConfigSelectorProps> = ({
  onChange,
  initialSelections,
}) => {
  const { biasMetricConfigs, statusState } = useModelBiasData();
  const elementId = React.useId();

  const spdConfigs = biasMetricConfigs.filter((x) => x.metricType === BiasMetricType.SPD);
  const dirConfigs = biasMetricConfigs.filter((x) => x.metricType === BiasMetricType.DIR);

  return (
    <div style={{ maxWidth: '600px' }}>
      <span id={elementId} hidden>
        Select the metrics to display charts for
      </span>
      <MultiSelection
        ariaLabel="Select a metric"
        groupedValues={[
          {
            id: 'SPD',
            name: 'SPD',
            values: spdConfigs.map((config) => ({
              id: config.id,
              name: config.name,
              selected: !!initialSelections.find((s) => s.id === config.id),
            })),
          },
          {
            id: 'DIR',
            name: 'DIR',
            values: dirConfigs.map((config) => ({
              id: config.id,
              name: config.name,
              selected: !!initialSelections.find((s) => s.id === config.id),
            })),
          },
        ]}
        setValue={(newState: SelectionOptions[]) => {
          const selections = newState.reduce<BiasMetricConfig[]>((acc, item) => {
            if (item.selected) {
              const selectedConfig = biasMetricConfigs.find((s) => s.id === item.id);
              if (selectedConfig) {
                acc.push(selectedConfig);
              }
            }
            return acc;
          }, []);
          onChange(selections);
        }}
        selectionRequired
        noSelectedOptionsMessage="One or more groups must be seleted"
        placeholder="Select a metric"
        isDisabled={
          !(statusState.type === TrustyInstallState.INSTALLED && biasMetricConfigs.length > 0)
        }
        id="bias-metric-config-selector"
        toggleId="bias-metric-config-selector"
      />
    </div>
  );
};

export default BiasMetricConfigSelector;
