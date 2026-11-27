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
  isPaused?: boolean;
  hasError: boolean;
  isCovered?: boolean;
  onViewFile: (fileKey: string, event: React.MouseEvent<HTMLButtonElement>) => void;
};

function DatasetCompatibilityCheck({
  training: currentTraining,
  test: currentTest,
  trainingFile,
  testFile,
  isChecking,
  isPaused = false,
  hasError,
  isCovered = false,
  onViewFile,
}: Props): React.JSX.Element | null {
  const [openSamples, setOpenSamples] = React.useState<{
    training: DatasetSample;
    test: DatasetSample;
  }>();
  const isOpen = Boolean(openSamples);
  const hasCurrentSamples = Boolean(
    currentTraining?.columns.length &&
    currentTest?.columns.length &&
    currentTraining.sampleSize &&
    currentTest.sampleSize,
  );
  const hasReadySamples = hasCurrentSamples && !isChecking && !isPaused && !hasError;
  // Retain the latest completed pair so a later failed/empty refresh cannot rewind the dialog.
  if (
    openSamples &&
    hasReadySamples &&
    currentTraining &&
    currentTest &&
    (openSamples.training !== currentTraining || openSamples.test !== currentTest)
  ) {
    setOpenSamples({ training: currentTraining, test: currentTest });
  }
  // Preserve the open dialog and its child portal if a refetch returns an empty file.
  const training = hasReadySamples ? currentTraining : openSamples?.training;
  const test = hasReadySamples ? currentTest : openSamples?.test;
  const [tab, setTab] = React.useState<string | number>(0);
  if (!trainingFile || !testFile || trainingFile === testFile) {
    return null;
  }
  if ((isChecking || isPaused) && !isOpen) {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} role="status">
        <Spinner size="sm" aria-label="Checking compatibility" />
        <span>
          {isPaused ? 'Waiting for connection to check compatibility…' : 'Checking compatibility…'}
        </span>
      </Flex>
    );
  }
  if (
    (hasError && !isOpen) ||
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
            <Button
              variant="link"
              isInline
              data-testid="dataset-compatibility-view-details"
              onClick={() => setOpenSamples({ training, test })}
            >
              View details
            </Button>
          </>
        }
      >
        {description}
      </Alert>
      {isOpen && (
        <Tearsheet
          isOpen
          modalProps={{ disableFocusTrap: isCovered }}
          onClose={() => {
            if (!isCovered) {
              setOpenSamples(undefined);
            }
          }}
          aria-label="Compatibility check"
        >
          <TearsheetHeader
            title="Compatibility check"
            description={<Content component="p">{sampleDescription}</Content>}
          />
          <TearsheetBody>
            <Stack hasGutter>
              {!isChecking && !isPaused && (hasError || !hasCurrentSamples) && (
                <StackItem>
                  <Alert
                    isInline
                    variant="danger"
                    title="Compatibility check could not be refreshed"
                  >
                    The displayed comparison uses previously sampled data. Close this view and retry
                    sampling the files.
                  </Alert>
                </StackItem>
              )}
              {(isChecking || isPaused) && (
                <StackItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} role="status">
                    <Spinner size="sm" aria-label="Refreshing compatibility" />
                    <span>
                      {isPaused
                        ? 'Waiting for connection to check compatibility…'
                        : 'Refreshing compatibility…'}
                    </span>
                  </Flex>
                </StackItem>
              )}
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
                            className={column.status !== 'match' ? 'automl-m-mismatch' : undefined}
                          >
                            <Td dataLabel="Column" hasLeftBorder={column.status !== 'match'}>
                              {column.status !== 'match' && (
                                <Icon status="warning" className="pf-v6-u-mr-sm">
                                  <ExclamationTriangleIcon />
                                </Icon>
                              )}
                              {column.name}
                            </Td>
                            <Td dataLabel="Training data">{column.trainingType}</Td>
                            <Td dataLabel="Test data">{column.testType}</Td>
                            <Td dataLabel="Status">
                              <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                spaceItems={{ default: 'spaceItemsSm' }}
                                className={`pf-v6-u-text-color-status-${
                                  COLUMN_STATUS_COLOR[column.status]
                                }`}
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
                                showParseWarnings={false}
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
                                        onClick={(event) => onViewFile(file, event)}
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
