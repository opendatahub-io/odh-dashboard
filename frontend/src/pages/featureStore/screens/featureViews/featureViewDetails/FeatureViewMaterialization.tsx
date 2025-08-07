import {
  Alert,
  AlertActionCloseButton,
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
import { Table } from '#~/components/table';
import { FeatureView } from '#~/pages/featureStore/types/featureView.ts';
import { MaterializationInterval } from '#~/pages/featureStore/types/global';
import FeatureStoreTimestamp from '#~/pages/featureStore/components/FeatureStoreTimestamp';
import { materializationColumns } from '#~/pages/featureStore/screens/featureViews/const';

type FeatureViewMaterializationProps = {
  featureView: FeatureView;
};

const MaterializationIntervalRow: React.FC<{
  interval: MaterializationInterval;
  index: number;
}> = ({ interval, index }) => (
  <Tr key={index}>
    <Td dataLabel="Materialization Interval">
      {new Date(interval.startTime).toLocaleString()} to{' '}
      {new Date(interval.endTime).toLocaleString()}
    </Td>
    <Td dataLabel="Created">
      <FeatureStoreTimestamp date={new Date(interval.startTime)} />
    </Td>
    <Td dataLabel="Updated">
      <FeatureStoreTimestamp date={new Date(interval.endTime)} />
    </Td>
  </Tr>
);

const FeatureViewMaterialization: React.FC<FeatureViewMaterializationProps> = ({ featureView }) => {
  const { materializationIntervals } = featureView.meta;
  const [showAlert, setShowAlert] = React.useState(true);

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
        {hasMaterializationData && showAlert && (
          <FlexItem>
            <Alert
              variant="info"
              isInline
              title=" Materialization is enabled to write offline features from offline store into online store."
              actionClose={<AlertActionCloseButton onClose={() => setShowAlert(false)} />}
              data-testid="materialization-info-alert"
            >
              Materialization is enabled to write offline features from offline store into online
              store.
            </Alert>
          </FlexItem>
        )}
        <FlexItem>
          {hasMaterializationData ? (
            <Table
              data-testid="materialization-intervals-table"
              id="materialization-intervals-table"
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
                No materialization jobs are available. Schedule job cons in OpenShift Platform.
              </EmptyStateBody>
            </EmptyState>
          )}
        </FlexItem>
      </Flex>
    </PageSection>
  );
};

export default FeatureViewMaterialization;
