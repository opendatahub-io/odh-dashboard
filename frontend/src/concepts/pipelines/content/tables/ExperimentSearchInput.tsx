import * as React from 'react';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core/deprecated';
import { SearchIcon } from '@patternfly/react-icons';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { PipelinesFilterOp } from '~/concepts/pipelines/kfTypes';
import useExperiments from '~/concepts/pipelines/apiHooks/useExperiments';

type Props = {
  onChange: (selected?: { label: string; value: string }) => void;
  selected?: { label: string; value: string };
};

const PipelineSearchInput: React.FC<Props> = ({ selected, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  const [filter, setFilter] = React.useState<PipelinesFilter>();
  const [{ items }, loaded] = useExperiments({ pageSize: filter ? 10 : 0, filter });

  const pipelines = React.useMemo(() => (filter && loaded ? items : []), [filter, loaded, items]);

  const setDebouncedFilter = useDebounceCallback(setFilter);
  React.useEffect(() => {
    setDebouncedFilter(
      filterText
        ? {
            predicates: [
              // eslint-disable-next-line camelcase
              { key: 'name', op: PipelinesFilterOp.IS_SUBSTRING, string_value: filterText },
            ],
          }
        : undefined,
    );
  }, [setDebouncedFilter, filterText]);

  const children = loaded
    ? pipelines.map((option) => (
        <SelectOption key={option.id} value={option.id}>
          {option.name}
        </SelectOption>
      ))
    : [];

  const hasSelection = React.useMemo(
    () => (selected?.value ? pipelines.find((p) => p.id === selected.value) : undefined),
    [pipelines, selected],
  );
  return (
    <Select
      toggleIcon={<SearchIcon />}
      autoComplete="off"
      isOpen={filter && open && pipelines.length > 0}
      variant={SelectVariant.typeahead}
      onFilter={() => children}
      onTypeaheadInputChanged={setFilterText}
      onToggle={(e, open) => setOpen(open)}
      selections={hasSelection ? selected?.value : undefined}
      onSelect={(_, value) => {
        if (typeof value === 'string') {
          const pipeline = pipelines.find((p) => p.id === value);
          if (pipeline) {
            setFilterText(pipeline.name);
            onChange({ value, label: pipeline.name });
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
    >
      {children}
    </Select>
  );
};

export default PipelineSearchInput;
