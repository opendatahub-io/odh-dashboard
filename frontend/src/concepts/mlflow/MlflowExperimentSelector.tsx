import * as React from 'react';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import { MlflowExperiment, MlflowSelectorStatus } from './types';
import { mlflowExperimentColumns } from './columns';
import useMlflowExperiments from './useMlflowExperiments';
import MlflowExperimentTable from './MlflowExperimentTable';

type MlflowExperimentSelectorProps = {
  workspace: string;
  filter?: string;
  selection?: string;
  onSelect: (experiment: MlflowExperiment) => void;
  onStatusChange?: (status: MlflowSelectorStatus) => void;
};

const MlflowExperimentSelector: React.FC<MlflowExperimentSelectorProps> = ({
  workspace,
  filter,
  selection,
  onSelect,
  onStatusChange,
}) => {
  const { data: experiments, loaded, error } = useMlflowExperiments({ workspace, filter });
  const [search, setSearch] = React.useState('');

  const statusCallbackRef = React.useRef(onStatusChange);
  statusCallbackRef.current = onStatusChange;

  React.useEffect(() => {
    statusCallbackRef.current?.({ loaded, error });
  }, [loaded, error]);

  const filtered = React.useMemo(() => {
    if (!search) {
      return experiments;
    }
    const lower = search.toLowerCase();
    return experiments.filter((e) => e.name.toLowerCase().includes(lower));
  }, [experiments, search]);

  const { transformData, getColumnSort } = useTableColumnSort(mlflowExperimentColumns, [], 0);
  const sorted = transformData(filtered);
  const experimentCount = experiments.length;
  const experimentLabel = experimentCount === 1 ? 'experiment' : 'experiments';

  let toggleLabel = 'Select an experiment';
  if (error) {
    toggleLabel = 'Error loading experiments';
  } else if (!loaded) {
    toggleLabel = 'Loading experiments';
  } else if (experiments.length === 0) {
    toggleLabel = 'No experiments available';
  } else if (selection) {
    toggleLabel = selection;
  }

  return (
    <SearchSelector
      dataTestId="mlflow-experiment-selector"
      onSearchChange={setSearch}
      onSearchClear={() => setSearch('')}
      searchValue={search}
      isLoading={!loaded && !error}
      isFullWidth
      toggleContent={toggleLabel}
      searchHelpText={`Type a name to search your ${experimentCount} ${experimentLabel}.`}
      isDisabled={!loaded || !!error || experimentCount === 0}
    >
      {({ menuClose }) => (
        <MlflowExperimentTable
          data={sorted}
          loaded={loaded}
          onSelect={onSelect}
          menuClose={menuClose}
          onClearSearch={() => setSearch('')}
          getColumnSort={getColumnSort}
        />
      )}
    </SearchSelector>
  );
};

export default MlflowExperimentSelector;
