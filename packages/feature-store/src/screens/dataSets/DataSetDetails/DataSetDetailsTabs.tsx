import { PageSection, Tab, Tabs, TabTitleText, Title } from '@patternfly/react-core';
import * as React from 'react';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import DataSetDetailsView from './DataSetDetailsView';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { featureViewRoute } from '../../../routes';
import { DataSetDetailsTab } from '../const';
import { DataSet } from '../../../types/dataSets';
import { featureRoute } from '../../../FeatureStoreRoutes';

type DataSetDetailsTabsProps = {
  dataSet: DataSet;
};

const DataSetDetailsTabs: React.FC<DataSetDetailsTabsProps> = ({ dataSet }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    DataSetDetailsTab.DETAILS,
  );
  const { currentProject } = useFeatureStoreProject();

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Data set details page"
      role="region"
      data-testid="data-set-details-page"
      mountOnEnter
      unmountOnExit
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={DataSetDetailsTab.DETAILS}
        title={<TabTitleText>{DataSetDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Data set details tab"
        data-testid="data-set-details-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled data-testid="data-set-details-tab-content">
          <DataSetDetailsView dataSet={dataSet} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={DataSetDetailsTab.FEATURES}
        title={<TabTitleText>{DataSetDetailsTab.FEATURES}</TabTitleText>}
        aria-label="Data set features tab"
        data-testid="data-set-features-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="data-set-features-tab-content"
          className="pf-v6-u-mt-xl"
        >
          <Title headingLevel="h3" data-testid="data-set-features">
            Features
          </Title>
          <Table aria-label="Features table" data-testid="features-table" variant="compact">
            <Thead>
              <Tr>
                <Th>Feature</Th>
                <Th
                  info={{
                    popover:
                      "The feature view this feature was retrieved from when the dataset was created. Feature views group related features and define how they're fetched from the source data.",
                  }}
                >
                  Feature view
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {dataSet.spec.features.map((feature) => {
                const [featureView, featureName] = feature.split(':');
                return (
                  <Tr key={feature}>
                    <Td>
                      <Link to={`${featureRoute(featureName, featureView, currentProject || '')}`}>
                        {featureName}
                      </Link>
                    </Td>
                    <Td>
                      <Link to={`${featureViewRoute(featureView, currentProject || '')}`}>
                        {featureView}
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </PageSection>
      </Tab>
    </Tabs>
  );
};

export default DataSetDetailsTabs;
