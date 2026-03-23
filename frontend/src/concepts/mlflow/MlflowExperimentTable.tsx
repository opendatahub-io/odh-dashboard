import * as React from 'react';
import { EmptyStateVariant, MenuContent } from '@patternfly/react-core';
import { TableVariant, Td, Tr } from '@patternfly/react-table';
import { TableBase } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { relativeTime } from '#~/utilities/time';
import { MlflowExperiment } from './types';
import { mlflowExperimentColumns } from './columns';
import { EXPERIMENT_NAME_COLUMN_WIDTH, EXPERIMENT_UPDATED_COLUMN_WIDTH } from './const';

type RowProps = {
  experiment: MlflowExperiment;
  onSelect: () => void;
  menuClose: () => void;
};

const MlflowExperimentRow: React.FC<RowProps> = ({ experiment, onSelect, menuClose }) => {
  const handleClick = React.useCallback(() => {
    onSelect();
    menuClose();
  }, [onSelect, menuClose]);

  return (
    <Tr onRowClick={handleClick} isClickable>
      <Td width={EXPERIMENT_NAME_COLUMN_WIDTH} modifier="truncate" tooltip={null}>
        {experiment.name}
      </Td>
      <Td width={EXPERIMENT_UPDATED_COLUMN_WIDTH}>
        {experiment.lastUpdateTime
          ? relativeTime(Date.now(), new Date(experiment.lastUpdateTime).getTime())
          : '-'}
      </Td>
    </Tr>
  );
};

type MlflowExperimentTableProps = {
  data: MlflowExperiment[];
  loaded: boolean;
  onSelect: (experiment: MlflowExperiment) => void;
  menuClose: () => void;
  onClearSearch: () => void;
  getColumnSort: React.ComponentProps<typeof TableBase>['getColumnSort'];
};

const MlflowExperimentTable: React.FC<MlflowExperimentTableProps> = ({
  data,
  loaded,
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
        onSelect={() => onSelect(row)}
        menuClose={menuClose}
      />
    ),
    [onSelect, menuClose],
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
