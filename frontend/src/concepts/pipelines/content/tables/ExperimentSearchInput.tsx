import * as React from 'react';
import { SearchIcon } from '@patternfly/react-icons';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { PipelinesFilterOp } from '~/concepts/pipelines/kfTypes';
import useExperiments from '~/concepts/pipelines/apiHooks/useExperiments';
import TypeaheadSelect from '~/components/TypeaheadSelect';

type Props = {
  onChange: (selected?: { label: string; value: string }) => void;
  selected?: { label: string; value: string };
};

const ExperimentSearchInput: React.FC<Props> = ({ selected, onChange }) => {
  const [filterText, setFilterText] = React.useState('');
  const [filter, setFilter] = React.useState<PipelinesFilter>();
  const [{ items }, loaded] = useExperiments({ pageSize: filter ? 10 : 0, filter });
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

  const selectOptions = React.useMemo(
    () =>
      loaded
        ? experiments.map((experiment) => ({
            value: experiment.experiment_id,
            content: experiment.display_name,
            selected: selected?.value === experiment.experiment_id,
          }))
        : [],
    [experiments, loaded, selected?.value],
  );

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      selected={selected?.value}
      onSelect={(_ev, value) => {
        if (typeof value === 'string') {
          const experiment = experiments.find((p) => p.experiment_id === value);
          if (experiment) {
            setFilterText(experiment.display_name);
            onChange({ value, label: experiment.display_name });
          }
        }
      }}
      onInputChange={setFilterText}
      placeholder="Search..."
      noOptionsFoundMessage="No matching experiments"
      noOptionsAvailableMessage="Search for an experiment name"
      toggleProps={{
        id: 'experiment-search-input',
        icon: <SearchIcon style={{ marginLeft: 8 }} />,
      }}
      data-testid="experiment-search-select"
    />
  );
};

export default ExperimentSearchInput;
