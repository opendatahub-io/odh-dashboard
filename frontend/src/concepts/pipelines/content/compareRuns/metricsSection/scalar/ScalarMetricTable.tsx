import * as React from 'react';
import { InnerScrollContainer, TableVariant, Td, Tr } from '@patternfly/react-table';
import { Bullseye, Flex, Spinner, Switch } from '@patternfly/react-core';
import { Table } from '#~/components/table';
import { RunArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { CompareRunsEmptyState } from '#~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';
import { CompareRunsNoMetrics } from '#~/concepts/pipelines/content/compareRuns/CompareRunsNoMetrics';
import { ScalarTableData } from './types';
import { generateTableStructure } from './utils';

type ScalarMetricTableProps = {
  runArtifacts?: RunArtifact[];
  isLoaded: boolean;
  isEmpty: boolean;
};

const ScalarMetricTable: React.FC<ScalarMetricTableProps> = ({
  runArtifacts,
  isLoaded,
  isEmpty,
}) => {
  const { columns, data, subColumns } = generateTableStructure(runArtifacts ?? []);

  const [isHideSameRowsChecked, setIsHideSameRowsChecked] = React.useState<boolean>(false);

  const hasScalarMetrics = data.length > 0 || !runArtifacts;

  const rowRenderer = ({ key, values }: ScalarTableData) => {
    // Hide rows with no differences if the switch is on
    if (values.every((value) => value === values[0]) && isHideSameRowsChecked) {
      return null;
    }

    return (
      <Tr key={key}>
        <Td
          dataLabel={key}
          hasRightBorder
          isStickyColumn
          modifier="fitContent"
          // Utility class pf-v6-u-background-color-200 does not exist in v6 currently but a replacement may be added, replacing with secondary background color token for now
          style={{ backgroundColor: 'var(--pf-t--global--background--color--secondary--default)' }}
        >
          <b>{key}</b>
        </Td>

        {values.map((value, index) => {
          const hasRightBorder = index !== values.length - 1 && {
            hasRightBorder: true,
          };

          return (
            <Td key={index} {...hasRightBorder}>
              {value}
            </Td>
          );
        })}
      </Tr>
    );
  };

  if (!isLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (isEmpty) {
    return <CompareRunsEmptyState data-testid="compare-runs-scalar-metrics-empty-state" />;
  }
  if (!hasScalarMetrics) {
    return <CompareRunsNoMetrics data-testid="compare-runs-scalar-metrics-no-data-state" />;
  }

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <Switch
        label="Hide parameters with no differences"
        isChecked={isHideSameRowsChecked}
        onChange={(_, checked) => setIsHideSameRowsChecked(checked)}
        id="hide-same-scalar-metrics-switch"
        data-testid="hide-same-scalar-metrics-switch"
      />

      <InnerScrollContainer>
        <Table
          data={data}
          columns={columns}
          subColumns={subColumns}
          rowRenderer={rowRenderer}
          variant={TableVariant.compact}
          id="compare-runs-scalar-metrics-table"
          data-testid="compare-runs-scalar-metrics-table"
          gridBreakPoint=""
        />
      </InnerScrollContainer>
    </Flex>
  );
};

export default ScalarMetricTable;
