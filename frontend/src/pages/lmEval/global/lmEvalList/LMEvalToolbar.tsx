import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import EvaluateModelButton from '#~/pages/lmEval/global/EvaluateModelButton';
import { LMEvalToolbarFilterOptions, LMEvalFilterDataType, LMEvalFilterOptions } from './const';

type LMEvalToolbarProps = {
  filterData: LMEvalFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const LMEvalToolbar: React.FC<LMEvalToolbarProps> = ({ filterData, onFilterUpdate }) => (
  <FilterToolbar<keyof typeof LMEvalFilterOptions>
    data-testid="lm-eval-table-toolbar"
    filterOptions={LMEvalFilterOptions}
    filterOptionRenders={{
      [LMEvalToolbarFilterOptions.name]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by name"
          placeholder="Filter by name"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [LMEvalToolbarFilterOptions.model]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by model"
          placeholder="Filter by model"
          onChange={(_event, value) => onChange(value)}
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
      <ToolbarItem>
        <EvaluateModelButton />
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default LMEvalToolbar;
