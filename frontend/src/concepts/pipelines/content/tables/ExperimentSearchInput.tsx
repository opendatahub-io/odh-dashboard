import * as React from 'react';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core/deprecated';
import { SearchIcon } from '@patternfly/react-icons';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { PipelinesFilterOp } from '~/concepts/pipelines/kfTypes';
import { useExperimentsV2 } from '~/concepts/pipelines/apiHooks/useExperiments';

type Props = {
  onChange: (selected?: { label: string; value: string }) => void;
  selected?: { label: string; value: string };
};

const ExperimentSearchInput: React.FC<Props> = ({ selected, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  const [filter, setFilter] = React.useState<PipelinesFilter>();
  const [{ items }, loaded] = useExperimentsV2({ pageSize: filter ? 10 : 0, filter });
  const experiments = React.useMemo(() => (filter && loaded ? items : []), [filter, loaded, items]);

  const setDebouncedFilter = useDebounceCallback(setFilter);
  React.useEffect(() => {
    setDebouncedFilter(
      filterText
        ? {
            predicates: [
              // eslint-disable-next-line camelcase
              { key: 'name', operation: PipelinesFilterOp.IS_SUBSTRING, string_value: filterText },
            ],
          }
        : undefined,
    );
  }, [setDebouncedFilter, filterText]);

  const children = loaded
    ? experiments.map((experiment) => (
        <SelectOption key={experiment.experiment_id} value={experiment.experiment_id}>
          {experiment.display_name}
        </SelectOption>
      ))
    : [];

  const hasSelection = React.useMemo(
    () =>
      selected?.value
        ? experiments.find((experiment) => experiment.experiment_id === selected.value)
        : undefined,
    [experiments, selected?.value],
  );

  return (
    <Select
      toggleIcon={<SearchIcon />}
      autoComplete="off"
      isOpen={open}
      variant={SelectVariant.typeahead}
      onFilter={() => children}
      onTypeaheadInputChanged={setFilterText}
      onToggle={(_e, open) => setOpen(open)}
      selections={hasSelection ? selected?.value : undefined}
      onSelect={(_, value) => {
        if (typeof value === 'string') {
          const experiment = experiments.find((p) => p.experiment_id === value);
          if (experiment) {
            setFilterText(experiment.display_name);
            onChange({ value, label: experiment.display_name });
            setOpen(false);
          }
        }
      }}
      onClear={() => {
        setFilterText('');
        setFilter(undefined);
      }}
      noResultsFoundText="Search for an experiment name"
      loadingVariant={filter && !loaded ? 'spinner' : undefined}
      isInputValuePersisted
      toggleId="experiment-search-input"
      data-testid="experiment-search-select"
    >
      {children}
    </Select>
  );
};

export default ExperimentSearchInput;
