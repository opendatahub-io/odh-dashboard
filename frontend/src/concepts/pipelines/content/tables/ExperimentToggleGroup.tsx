import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';

type ExperimentToggleGroupProps = {
  selectedItem: ToggleGroupOption;
  onSelection: (item: ToggleGroupOption) => void;
};

export enum ToggleGroupOption {
  EXPERIMENT_VIEW = 'Experiment',
  RUN_VIEW = 'Run',
}

const ToggleGroupOptionLookup: Record<string, ToggleGroupOption> = {
  EXPERIMENT_VIEW: ToggleGroupOption.EXPERIMENT_VIEW,
  RUN_VIEW: ToggleGroupOption.RUN_VIEW,
};

const ExperimentToggleGroup: React.FC<ExperimentToggleGroupProps> = ({
  selectedItem,
  onSelection,
}) => (
  <ToggleGroup aria-label="Default with single selectable">
    {Object.keys(ToggleGroupOption).map((key) => {
      const optionValue = ToggleGroupOptionLookup[key];
      return (
        <ToggleGroupItem
          key={key}
          text={optionValue}
          buttonId={`${optionValue}-toggle`}
          isSelected={selectedItem === optionValue}
          onChange={() => onSelection(optionValue)}
        />
      );
    })}
  </ToggleGroup>
);

export default ExperimentToggleGroup;
