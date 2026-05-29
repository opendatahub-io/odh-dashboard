import * as React from 'react';
import { EmptyStateVariant, MenuContent } from '@patternfly/react-core';
import { TableVariant, Td, Tr } from '@patternfly/react-table';
import { CheckIcon } from '@patternfly/react-icons';
import { TableBase } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { relativeTime } from '#~/utilities/time';
import { MlflowExperiment } from './types';
import { mlflowExperimentColumns } from './columns';
import './MlflowExperimentTable.scss';

type RowProps = {
  experiment: MlflowExperiment;
  onSelect: (experiment: MlflowExperiment) => void;
  menuClose: () => void;
  isSelected: boolean;
};

const MlflowExperimentRow: React.FC<RowProps> = ({
  experiment,
  onSelect,
  menuClose,
  isSelected,
}) => {
  const handleClick = React.useCallback(() => {
    onSelect(experiment);
    menuClose();
  }, [experiment, onSelect, menuClose]);

  return (
    <Tr onRowClick={handleClick} isClickable aria-selected={isSelected}>
      <Td modifier="truncate" tooltip={null}>
        {experiment.name}
      </Td>
      <Td>
        <div
          className={`mlflow-experiment-row__last-updated${
            isSelected ? ' mlflow-experiment-row__last-updated--selected' : ''
          }`}
        >
          {experiment.lastUpdateTime
            ? relativeTime(Date.now(), new Date(experiment.lastUpdateTime).getTime())
            : '-'}
          {isSelected ? (
            <CheckIcon
              color="var(--pf-t--global--icon--color--brand--default)"
              data-testid={`selected-experiment-icon-${experiment.id}`}
              className="mlflow-experiment-row__check-icon"
            />
          ) : null}
        </div>
      </Td>
    </Tr>
  );
};

type MlflowExperimentTableProps = {
  data: MlflowExperiment[];
  loaded: boolean;
  selection?: string;
  onSelect: (experiment: MlflowExperiment) => void;
  menuClose: () => void;
  onClearSearch: () => void;
  getColumnSort: React.ComponentProps<typeof TableBase>['getColumnSort'];
};

const MlflowExperimentTable: React.FC<MlflowExperimentTableProps> = ({
  data,
  loaded,
  selection,
  onSelect,
  menuClose,
  onClearSearch,
  getColumnSort,
}) => {
  const renderRow = React.useCallback(
    (row: MlflowExperiment) => (
      <MlflowExperimentRow
        key={row.id}
        experiment={row}
        isSelected={row.name === selection}
        onSelect={onSelect}
        menuClose={menuClose}
      />
    ),
    [selection, onSelect, menuClose],
  );

  return (
    <MenuContent>
      <TableBase
        itemCount={data.length}
        loading={!loaded}
        emptyTableView={
          <DashboardEmptyTableView
            hasIcon={false}
            onClearFilters={onClearSearch}
            variant={EmptyStateVariant.xs}
          />
        }
        data-testid="mlflow-experiment-selector-table-list"
        borders={false}
        variant={TableVariant.compact}
        columns={mlflowExperimentColumns}
        data={data}
        rowRenderer={renderRow}
        getColumnSort={getColumnSort}
      />
    </MenuContent>
  );
};

export default MlflowExperimentTable;
