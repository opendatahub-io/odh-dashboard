import React from 'react';

import { ExpandableSection, Flex, Switch } from '@patternfly/react-core';
import { InnerScrollContainer, TableVariant, Td, Tr } from '@patternfly/react-table';

import { SortableData, Table } from '#~/components/table';
import { useCompareRuns } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { RuntimeConfigParamValue } from '#~/concepts/pipelines/kfTypes';
import { normalizeInputParamValue } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { CompareRunsEmptyState } from '#~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';

export const CompareRunParamsSection: React.FunctionComponent = () => {
  const { loaded, selectedRuns } = useCompareRuns();
  const [isSectionOpen, setIsSectionOpen] = React.useState(true);
  const [isHideSameRowsChecked, setIsHideSameRowsChecked] = React.useState<boolean>(false);

  const runNameColumns: SortableData<[string, Record<string, RuntimeConfigParamValue>]>[] =
    React.useMemo(
      () => [
        {
          label: 'Run name',
          field: 'run-name',
          isStickyColumn: true,
          hasRightBorder: true,
          // https://github.com/patternfly/patternfly-react/discussions/10269
          // Utility class pf-v6-u-background-color-200 does not exist in v6 currently but a replacement may be added, replacing with secondary background color token for now
          style: { backgroundColor: 'var(--pf-t--global--background--color--secondary--default)' },
          sortable: false,
        },
        ...selectedRuns.map(
          (run, index): SortableData<[string, Record<string, RuntimeConfigParamValue>]> => ({
            label: run.display_name,
            field: run.run_id,
            sortable: false,
            modifier: 'nowrap',
            hasRightBorder: index !== selectedRuns.length - 1,
          }),
        ),
      ],
      [selectedRuns],
    );

  const runParamsMap = React.useMemo(
    () =>
      selectedRuns.reduce(
        (acc: Record<string, Record<string, RuntimeConfigParamValue>>, selectedRun) => {
          Object.entries(selectedRun.runtime_config?.parameters || {}).forEach(
            ([paramKey, paramValue]) => {
              if (!Object.keys(acc).includes(paramKey)) {
                acc[paramKey] = { [selectedRun.run_id]: paramValue };
              } else if (!Object.keys(acc[paramKey]).includes(selectedRun.run_id)) {
                acc[paramKey] = { ...acc[paramKey], [selectedRun.run_id]: paramValue };
              }
            },
          );

          return acc;
        },
        {},
      ),
    [selectedRuns],
  );
  const hasParameters = !!Object.values(runParamsMap).length;

  const rowRenderer = React.useCallback(
    ([paramKey, paramValuesMap]: [string, Record<string, RuntimeConfigParamValue>]) => {
      const paramValues = Object.values(paramValuesMap);
      const hasSameParamValues = paramValues.every(
        (value) => normalizeInputParamValue(value) === normalizeInputParamValue(paramValues[0]),
      );

      // Hide all rows that have the same parameter value for every run when switch for diff values only is on
      if (
        paramValues.length === selectedRuns.length &&
        hasSameParamValues &&
        isHideSameRowsChecked
      ) {
        return null;
      }

      return (
        <Tr key={paramKey}>
          <Td
            dataLabel={paramKey}
            hasRightBorder
            isStickyColumn
            modifier="fitContent"
            style={{
              backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
            }}
          >
            <b>{paramKey}</b>
          </Td>

          {selectedRuns.map(({ run_id: runId }, index) => {
            const hasRightBorder = index !== selectedRuns.length - 1 && {
              hasRightBorder: true,
            };

            if (Object.keys(paramValuesMap).includes(runId)) {
              const paramId = `${runId}-value-${index}`;
              const paramValue = paramValuesMap[runId];

              return (
                <Td key={paramId} dataLabel={paramId} {...hasRightBorder} modifier="nowrap">
                  {normalizeInputParamValue(paramValue)}
                </Td>
              );
            }

            return <Td key={index} {...hasRightBorder} />;
          })}
        </Tr>
      );
    },
    [isHideSameRowsChecked, selectedRuns],
  );

  return (
    <ExpandableSection
      toggleText="Parameters"
      onToggle={(_, isOpen) => setIsSectionOpen(isOpen)}
      isExpanded={isSectionOpen}
      isIndented
    >
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
        {hasParameters && (
          <Switch
            label="Hide parameters with no differences"
            isChecked={isHideSameRowsChecked}
            onChange={(_, checked) => setIsHideSameRowsChecked(checked)}
            id="hide-same-params-switch"
            data-testid="hide-same-params-switch"
          />
        )}

        <InnerScrollContainer>
          <Table
            loading={!loaded}
            data={Object.entries(runParamsMap).toSorted()}
            columns={hasParameters ? runNameColumns : []}
            hasNestedHeader
            emptyTableView={
              <CompareRunsEmptyState
                title="No parameters"
                data-testid="compare-runs-params-empty-state"
              />
            }
            rowRenderer={rowRenderer}
            variant={TableVariant.compact}
            id="compare-runs-params-table"
            data-testid="compare-runs-params-table"
            gridBreakPoint=""
          />
        </InnerScrollContainer>
      </Flex>
    </ExpandableSection>
  );
};
