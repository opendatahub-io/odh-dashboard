import React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Icon,
  Spinner,
  Stack,
  StackItem,
  Tab,
  TabContentBody,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { Tearsheet, TearsheetBody, TearsheetHeader } from '@patternfly/react-component-groups';
import { CheckCircleIcon, ExclamationTriangleIcon, TimesIcon } from '@patternfly/react-icons';
import { TableBase } from '@odh-dashboard/ui-core';
import { Td, Tr } from '@patternfly/react-table';
import type { DatasetSample } from '~/app/hooks/useS3GetFileSchemaQuery';
import {
  COLUMN_COMPARISON_STATUS,
  compareDatasetColumns,
  type ColumnComparison,
} from '~/app/utilities/datasetSplit';
import DatasetSampleTable from './DatasetSampleTable';

const COLUMN_STATUS_COLOR: Record<ColumnComparison['status'], string> = {
  match: 'success',
  'type-mismatch': 'danger',
  'missing-training': 'danger',
  'missing-test': 'danger',
  'duplicate-name': 'danger',
  unknown: 'warning',
};

type Props = {
  training?: DatasetSample;
  test?: DatasetSample;
  trainingFile: string;
  testFile: string;
  isChecking: boolean;
  hasError: boolean;
  isCovered?: boolean;
  onViewFile: (fileKey: string) => void;
};

function DatasetCompatibilityCheck({
  training,
  test,
  trainingFile,
  testFile,
  isChecking,
  hasError,
  isCovered = false,
  onViewFile,
}: Props): React.JSX.Element | null {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tab, setTab] = React.useState<string | number>(0);
  if (!trainingFile || !testFile || trainingFile === testFile) {
    return null;
  }
  if (isChecking) {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} role="status">
        <Spinner size="sm" aria-label="Checking compatibility" />
        <span>Checking compatibility…</span>
      </Flex>
    );
  }
  if (
    hasError ||
    !training?.columns.length ||
    !test?.columns.length ||
    !training.sampleSize ||
    !test.sampleSize
  ) {
    return null;
  }
  const comparison = compareDatasetColumns(training.columns, test.columns);
  const hasConflicts = comparison.some(({ status }) => status !== 'match' && status !== 'unknown');
  const hasWarnings =
    comparison.some(({ status }) => status === 'unknown') ||
    training.parseWarnings > 0 ||
    test.parseWarnings > 0;
  const needsReview = hasConflicts || hasWarnings;
  const highlightedColumns = new Set(
    comparison.filter(({ status }) => status !== 'match').map(({ name }) => name),
  );
  let title = 'Compatibility check passed';
  let description = 'The sampled data uses matching column names and compatible data types.';
  let sampleDescription =
    'Review the sampled data below. Sampled rows are compatible, but differences in unchecked rows might still cause your experiment to fail.';
  if (hasConflicts) {
    title = 'Compatibility check: incompatibilities found.';
    description = 'The selected files have conflicting schemas or data formats.';
    sampleDescription =
      'Review the sampled data below. Inconsistencies were detected that might cause your experiment to fail, but you can continue anyway.';
  } else if (hasWarnings) {
    title = 'Compatibility check: inconclusive.';
    description =
      'Insufficient sample values or skipped rows prevented a complete compatibility check.';
    sampleDescription =
      'Review the sampled data below. Insufficient values or skipped rows prevented a complete compatibility check. You can continue, but review the source files first.';
  }

  return (
    <>
      <Alert
        isInline
        isPlain
        variant={needsReview ? 'warning' : 'success'}
        title={
          <>
            {title}
            {needsReview ? ' ' : ' · '}
            <Button variant="link" isInline onClick={() => setIsOpen(true)}>
              View details
            </Button>
          </>
        }
      >
        {description}
      </Alert>
      {isOpen && (
        <Tearsheet
          isOpen={!isCovered}
          onClose={() => setIsOpen(false)}
          aria-label="Compatibility check"
        >
          <TearsheetHeader
            title="Compatibility check"
            description={<Content component="p">{sampleDescription}</Content>}
          />
          <TearsheetBody>
            <Stack hasGutter>
              {(training.parseWarnings > 0 || test.parseWarnings > 0) && (
                <StackItem>
                  <Alert isInline variant="warning" title="Some rows could not be sampled">
                    Skipped {training.parseWarnings} training rows and {test.parseWarnings} test
                    rows because they could not be parsed. Review the source files before
                    continuing.
                  </Alert>
                </StackItem>
              )}
              <StackItem>
                <Tabs
                  activeKey={tab}
                  onSelect={(_event, key) => setTab(key)}
                  aria-label="Compatibility check views"
                >
                  <Tab eventKey={0} title={<TabTitleText>Column comparison</TabTitleText>}>
                    <TabContentBody className="pf-v6-u-pt-lg">
                      <TableBase
                        aria-label="Training and test column comparison"
                        data={comparison}
                        columns={['Column', 'Training data', 'Test data', 'Status'].map(
                          (label) => ({
                            label,
                            field: label,
                            sortable: false,
                          }),
                        )}
                        rowRenderer={(column) => (
                          <Tr
                            key={column.name}
                            className={
                              column.status !== 'match'
                                ? 'automl-dataset-preview__mismatch'
                                : undefined
                            }
                          >
                            <Td dataLabel="Column" hasLeftBorder={column.status !== 'match'}>
                              {column.status !== 'match' && (
                                <Icon status="warning" className="pf-v6-u-mr-sm">
                                  <ExclamationTriangleIcon />
                                </Icon>
                              )}
                              {column.name}
                            </Td>
                            <Td dataLabel="Training data" hasLeftBorder={column.status !== 'match'}>
                              {column.trainingType}
                            </Td>
                            <Td dataLabel="Test data" hasLeftBorder={column.status !== 'match'}>
                              {column.testType}
                            </Td>
                            <Td dataLabel="Status" hasLeftBorder={column.status !== 'match'}>
                              <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                spaceItems={{ default: 'spaceItemsSm' }}
                                className={`pf-v6-u-text-color-status-${COLUMN_STATUS_COLOR[column.status]}`}
                              >
                                <FlexItem>
                                  {column.status === 'match' ? (
                                    <CheckCircleIcon />
                                  ) : column.status === 'unknown' ? (
                                    <ExclamationTriangleIcon />
                                  ) : (
                                    <TimesIcon />
                                  )}
                                </FlexItem>
                                <FlexItem>{COLUMN_COMPARISON_STATUS[column.status]}</FlexItem>
                              </Flex>
                            </Td>
                          </Tr>
                        )}
                      />
                    </TabContentBody>
                  </Tab>
                  <Tab eventKey={1} title={<TabTitleText>Data preview</TabTitleText>}>
                    <Flex
                      direction={{ default: 'column' }}
                      rowGap={{ default: 'rowGap2xl' }}
                      className="pf-v6-u-mt-lg"
                    >
                      {[
                        { label: 'Training data', file: trainingFile, sample: training },
                        { label: 'Test data', file: testFile, sample: test },
                      ].map(({ label, file, sample }) => (
                        <FlexItem key={label}>
                          <Card isCompact>
                            <CardBody>
                              <DatasetSampleTable
                                key={file}
                                sample={sample}
                                label={`${label} preview`}
                                heading={
                                  <Flex
                                    justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    className="pf-v6-u-pr-lg"
                                  >
                                    <FlexItem>
                                      <Content component="h3">
                                        {label}: {file.split('/').pop()}
                                      </Content>
                                    </FlexItem>
                                    <FlexItem>
                                      <Button
                                        variant="link"
                                        isInline
                                        onClick={() => onViewFile(file)}
                                      >
                                        View file
                                      </Button>
                                    </FlexItem>
                                  </Flex>
                                }
                                highlightedColumns={highlightedColumns}
                              />
                            </CardBody>
                          </Card>
                        </FlexItem>
                      ))}
                    </Flex>
                  </Tab>
                </Tabs>
              </StackItem>
            </Stack>
          </TearsheetBody>
        </Tearsheet>
      )}
    </>
  );
}
export default DatasetCompatibilityCheck;
