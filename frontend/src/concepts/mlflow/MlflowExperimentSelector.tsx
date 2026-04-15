import * as React from 'react';
import {
  HelperText,
  HelperTextItem,
  Icon,
  Menu,
  MenuContainer,
  MenuContent,
  MenuList,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import { MlflowExperiment, MlflowSelectorStatus } from './types';
import { mlflowExperimentColumns } from './columns';
import useMlflowExperiments from './useMlflowExperiments';
import MlflowExperimentTable from './MlflowExperimentTable';

type MlflowExperimentSelectorProps = {
  workspace: string;
  filter?: string;
  selection?: string;
  isDisabled?: boolean;
  onSelect: (experiment: MlflowExperiment) => void;
  onStatusChange?: (status: MlflowSelectorStatus) => void;
};

const MlflowExperimentSelector: React.FC<MlflowExperimentSelectorProps> = ({
  workspace,
  filter,
  selection,
  isDisabled = false,
  onSelect,
  onStatusChange,
}) => {
  const { data: experiments, loaded, error } = useMlflowExperiments({ workspace, filter });
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

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
  const isLoading = !loaded && !error;
  const toggleDisabled = isDisabled || !loaded || !!error || experimentCount === 0;

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
    <MenuContainer
      isOpen={isOpen}
      toggleRef={toggleRef}
      menuRef={menuRef}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSearch('');
        }
      }}
      toggle={
        <MenuToggle
          ref={toggleRef}
          style={{ minWidth: '300px', maxWidth: '500px' }}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={toggleDisabled}
          isFullWidth
          data-testid="mlflow-experiment-selector-toggle"
          icon={
            isLoading ? (
              <Icon>
                <Spinner size="sm" aria-label="Loading" />
              </Icon>
            ) : undefined
          }
        >
          {toggleLabel}
        </MenuToggle>
      }
      menu={
        <Menu
          ref={menuRef}
          isScrollable
          data-testid="mlflow-experiment-selector-menu"
          onSelect={() => setIsOpen(false)}
        >
          <MenuSearch>
            <MenuSearchInput>
              <SearchInput
                data-testid="mlflow-experiment-selector-search"
                aria-label="Search for an MLflow experiment"
                onChange={(_e, value) => setSearch(value)}
                onClear={(e) => {
                  e.stopPropagation();
                  setSearch('');
                }}
                value={search}
              />
            </MenuSearchInput>
            <HelperText>
              <HelperTextItem data-testid="mlflow-experiment-selector-searchHelpText">
                {`Type a name to search your ${experimentCount} ${experimentLabel}.`}
              </HelperTextItem>
            </HelperText>
          </MenuSearch>
          <MenuContent maxMenuHeight="200px">
            <MenuList data-testid="mlflow-experiment-selector-menuList">
              <MlflowExperimentTable
                data={sorted}
                loaded={loaded}
                selection={selection}
                onSelect={onSelect}
                menuClose={() => setIsOpen(false)}
                onClearSearch={() => setSearch('')}
                getColumnSort={getColumnSort}
              />
            </MenuList>
          </MenuContent>
        </Menu>
      }
    />
  );
};

export default MlflowExperimentSelector;
