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

const ExperimentToggleGroup: React.FC<ExperimentToggleGroupProps> = ({
  selectedItem,
  onSelection,
}) => (
  <ToggleGroup aria-label="Default with single selectable">
    {Object.keys(ToggleGroupOption).map((key) => (
      <ToggleGroupItem
        key={key}
        text={ToggleGroupOption[key]}
        buttonId={`${ToggleGroupOption[key]}-toggle`}
        isSelected={selectedItem === ToggleGroupOption[key]}
        onChange={() => onSelection(ToggleGroupOption[key])}
      />
    ))}
  </ToggleGroup>
);

export default ExperimentToggleGroup;
