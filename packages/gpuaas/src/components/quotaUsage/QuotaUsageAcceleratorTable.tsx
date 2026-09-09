import * as React from 'react';
import {
  Alert,
  Content,
  EmptyState,
  EmptyStateBody,
  SearchInput,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Tr, Td } from '@patternfly/react-table';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
import QuotaUsageAccordionSection from './QuotaUsageAccordionSection';
import QuotaUsageMeter from './QuotaUsageMeter';
import { QUOTA_USAGE_ACCELERATOR_TABLE, QUOTA_USAGE_ACCELERATOR_TABLE_COLUMNS } from '../../const';
import {
  QuotaUsageAcceleratorRow,
  QuotaUsageSummary,
  QUOTA_USAGE_METER_VARIANT,
} from '../../types';

type QuotaUsageAcceleratorTableProps = {
  rows: QuotaUsageAcceleratorRow[];
  summary: QuotaUsageSummary;
  error?: Error;
};

const normalizeModelTestId = (model: string): string =>
  model.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const QuotaUsageAcceleratorTable: React.FC<QuotaUsageAcceleratorTableProps> = ({
  rows,
  summary,
  error,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [filterText, setFilterText] = React.useState('');

  const filteredRows = React.useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) => row.model.toLowerCase().includes(query));
  }, [filterText, rows]);

  const body = error ? (
    <Alert
      isInline
      variant="danger"
      title="Error loading accelerator usage"
      data-testid="quota-usage-accelerator-table-error"
    >
      {error.message}
    </Alert>
  ) : rows.length === 0 ? (
    <EmptyState headingLevel="h4" icon={PlusCircleIcon} titleText="No accelerator models">
      <EmptyStateBody data-testid="quota-usage-accelerator-table-empty">
        {QUOTA_USAGE_ACCELERATOR_TABLE.empty}
      </EmptyStateBody>
    </EmptyState>
  ) : (
    <Table
      data={filteredRows}
      columns={QUOTA_USAGE_ACCELERATOR_TABLE_COLUMNS}
      enablePagination
      toolbarContent={
        <ToolbarGroup>
          <ToolbarItem>
            <SearchInput
              placeholder="Search by name"
              value={filterText}
              onChange={(_event, value) => setFilterText(value)}
              onClear={() => setFilterText('')}
              data-testid="quota-usage-accelerator-table-search"
            />
          </ToolbarItem>
        </ToolbarGroup>
      }
      onClearFilters={() => setFilterText('')}
      rowRenderer={(row) => {
        const modelId = normalizeModelTestId(row.model);
        const rowCapacity = row.nominal > 0 ? row.nominal : row.used > 0 ? row.used : row.nominal;

        return (
          <Tr key={row.model} data-testid={`quota-usage-accelerator-row-${modelId}`}>
            <Td dataLabel={QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.accelerator}>{row.model}</Td>
            <Td
              dataLabel={QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.capacity}
              style={{ verticalAlign: 'middle' }}
            >
              <QuotaUsageMeter
                variant={QUOTA_USAGE_METER_VARIANT.capacity}
                used={row.used}
                capacity={rowCapacity}
                ariaLabel={`${row.model} capacity`}
                compact
                data-testid={`quota-usage-meter-capacity-${modelId}`}
              />
            </Td>
            <Td
              dataLabel={QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.compute}
              style={{ verticalAlign: 'middle' }}
            >
              <QuotaUsageMeter
                variant={QUOTA_USAGE_METER_VARIANT.utilization}
                used={row.used}
                capacity={rowCapacity}
                percentage={row.computePercentage}
                showOverQuotaVisual={summary.isOverQuota}
                ariaLabel={`${row.model} compute`}
                compact
                data-testid={`quota-usage-meter-compute-${modelId}`}
              />
            </Td>
            <Td
              dataLabel={QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.memory}
              style={{ verticalAlign: 'middle' }}
            >
              <QuotaUsageMeter
                variant={QUOTA_USAGE_METER_VARIANT.utilization}
                used={row.used}
                capacity={rowCapacity}
                percentage={row.memoryPercentage}
                showOverQuotaVisual={summary.isOverQuota}
                ariaLabel={`${row.model} memory`}
                compact
                data-testid={`quota-usage-meter-memory-${modelId}`}
              />
            </Td>
          </Tr>
        );
      }}
      emptyTableView={<DashboardEmptyTableView onClearFilters={() => setFilterText('')} />}
    />
  );

  return (
    <QuotaUsageAccordionSection
      id="quota-usage-accelerator-table"
      title={QUOTA_USAGE_ACCELERATOR_TABLE.acceleratorTableTitle}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((expanded) => !expanded)}
      data-testid="quota-usage-accelerator-table-section"
    >
      <Content component="p">{QUOTA_USAGE_ACCELERATOR_TABLE.acceleratorTableSubtitle} </Content>
      {body}
    </QuotaUsageAccordionSection>
  );
};

export default QuotaUsageAcceleratorTable;
