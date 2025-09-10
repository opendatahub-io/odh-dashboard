import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { PlusCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import { FeatureView } from '../../../types/featureView';
import { MaterializationInterval } from '../../../types/global';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';
import { materializationColumns } from '../const';

type FeatureViewMaterializationProps = {
  featureView: FeatureView;
};

const MaterializationIntervalRow: React.FC<{
  interval: MaterializationInterval;
  index: number;
}> = ({ interval, index }) => (
  <Tr key={index}>
    <Td dataLabel="Materialization interval">
      {new Date(interval.startTime).toLocaleString()} to{' '}
      {new Date(interval.endTime).toLocaleString()}
    </Td>
    <Td dataLabel="Created">
      <FeatureStoreTimestamp date={new Date(interval.startTime)} />
    </Td>
    <Td dataLabel="Last modified">
      <FeatureStoreTimestamp date={new Date(interval.endTime)} />
    </Td>
  </Tr>
);

const FeatureViewMaterialization: React.FC<FeatureViewMaterializationProps> = ({ featureView }) => {
  const { materializationIntervals } = featureView.meta;

  const hasMaterializationData = materializationIntervals && materializationIntervals.length > 0;

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      isWidthLimited
      style={hasMaterializationData ? { maxWidth: '75%' } : {}}
    >
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItems2xl' }}
        className="pf-v6-u-mt-xl"
      >
        <FlexItem>
          {hasMaterializationData ? (
            <Table
              data-testid="materialization-intervals-table"
              id="materialization-intervals-table"
              variant="compact"
              data={materializationIntervals}
              columns={materializationColumns}
              rowRenderer={(interval, idx) => (
                <MaterializationIntervalRow key={idx} interval={interval} index={idx} />
              )}
            />
          ) : (
            <EmptyState
              width="100%"
              height="100%"
              icon={PlusCircleIcon}
              title="No materialization jobs"
              titleText="No materialization jobs"
              headingLevel="h1"
              variant={EmptyStateVariant.sm}
              data-testid="no-materialization-jobs-empty-state"
            >
              <EmptyStateBody>
                No materialization jobs are scheduled. To create and manage these jobs, schedule
                corresponding cron jobs in OpenShift.
              </EmptyStateBody>
            </EmptyState>
          )}
        </FlexItem>
      </Flex>
    </PageSection>
  );
};

export default FeatureViewMaterialization;
