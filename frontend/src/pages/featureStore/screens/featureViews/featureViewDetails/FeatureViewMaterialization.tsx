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
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { PlusCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { FeatureView } from '#~/pages/featureStore/types/featureView.ts';
import FeatureStoreTimestamp from '#~/pages/featureStore/components/FeatureStoreTimestamp';

type FeatureViewMaterializationProps = {
  featureView: FeatureView;
};

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
              aria-label="Materialization intervals table"
              data-testid="materialization-intervals-table"
              variant="compact"
            >
              <Thead>
                <Tr>
                  <Th>Materialization Interval</Th>
                  <Th>Created</Th>
                  <Th>Updated</Th>
                </Tr>
              </Thead>
              <Tbody>
                {materializationIntervals.map((interval, index) => (
                  <Tr key={index}>
                    <Td>
                      {new Date(interval.startTime).toLocaleString()} -{' '}
                      {new Date(interval.endTime).toLocaleString()}
                    </Td>
                    <Td>
                      <FeatureStoreTimestamp date={new Date(interval.startTime)} />
                    </Td>
                    <Td>
                      <FeatureStoreTimestamp date={new Date(interval.endTime)} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
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
