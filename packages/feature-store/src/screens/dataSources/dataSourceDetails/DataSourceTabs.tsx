import {
  Bullseye,
  Button,
  EmptyState,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import DataSourceDetailsView from './DataSourceDetailsView';
import { DataSourceDetailsTab } from '../const';
import { DataSource } from '../../../types/dataSources';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureViews from '../../../apiHooks/useFeatureViews';
import { getRelationshipsByTargetType } from '../../../utils/filterUtils';
import ScrollableLinksPopover from '../../../components/ScrollableLinksPopover';
import { featureServiceRoute, featureViewRoute } from '../../../routes';

type FeatureViewsWithServices = {
  featureViewName: string;
  featureServices: Array<{
    name: string;
    to: string;
    type: string;
  }>;
};

type DataSourceDetailsTabsProps = {
  dataSource: DataSource;
};
const FeatureViewsTabContent: React.FC<{
  featureViewsWithServices: FeatureViewsWithServices[];
  currentProject: string;
}> = ({ featureViewsWithServices, currentProject }) => {
  return (
    <Table
      aria-label="Data sources table"
      data-testid="feature-view-data-sources-table"
      variant="compact"
    >
      <Thead>
        <Tr>
          <Th width={20}>Feature View</Th>
          <Th width={20}>Feature service consumers</Th>
        </Tr>
      </Thead>
      <Tbody>
        {featureViewsWithServices.map((featureView) => (
          <Tr key={featureView.featureViewName}>
            <Td>
              <Link to={featureViewRoute(featureView.featureViewName, currentProject)}>
                {featureView.featureViewName}
              </Link>
            </Td>
            <Td>
              <ScrollableLinksPopover
                trigger={
                  <Button variant="link" isInline>
                    {featureView.featureServices.length}{' '}
                    {featureView.featureServices.length === 1
                      ? 'feature service'
                      : 'feature services'}
                  </Button>
                }
                links={featureView.featureServices}
                aria-label="Feature services popover"
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

const SchemaTabContent: React.FC<{
  dataSource: DataSource;
}> = ({ dataSource }) => {
  return (
    <Table
      aria-label="Data sources table"
      data-testid="feature-view-data-sources-table"
      variant="compact"
    >
      <Thead>
        <Tr>
          <Th width={20}>Feature</Th>
          <Th width={20}>Value type</Th>
        </Tr>
      </Thead>
      <Tbody>
        {dataSource.requestDataOptions?.schema.map((schemaData) => (
          <Tr key={schemaData.name}>
            <Td>{schemaData.name}</Td>
            <Td>{schemaData.valueType}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

const DataSourceDetailsTabs: React.FC<DataSourceDetailsTabsProps> = ({ dataSource }) => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: featureViews,
    loaded: featureViewsLoaded,
    error: featureViewsLoadError,
    // eslint-disable-next-line camelcase
  } = useFeatureViews({ project: currentProject, ...{ data_source: dataSource.name } });

  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    DataSourceDetailsTab.DETAILS,
  );

  const featureViewsWithServices = React.useMemo(() => {
    const project = dataSource.project || currentProject;
    return featureViews.featureViews.map((featureView) => {
      const featureViewName = featureView.spec.name;
      const featureServices = getRelationshipsByTargetType(
        featureViews.relationships,
        featureViewName,
        'featureService',
      );

      return {
        featureViewName,
        featureServices: featureServices.map((rel) => ({
          name: rel.target.name,
          to: featureServiceRoute(rel.target.name, project ?? ''),
          type: 'featureService',
        })),
      };
    });
  }, [featureViews.relationships, dataSource.name, dataSource.project, currentProject]);

  const emptyState = (
    <EmptyState>
      <EmptyState icon={SearchIcon} />
      <Title headingLevel="h5" size="lg" data-testid="data-source-feature-views-empty-state-title">
        No feature views found
      </Title>
    </EmptyState>
  );

  if (featureViewsLoadError) {
    return (
      <EmptyState>
        <EmptyState icon={SearchIcon} />
        <Title headingLevel="h5" size="lg">
          Error loading feature views
        </Title>
      </EmptyState>
    );
  }

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Data source details page"
      role="region"
      data-testid="data-source-details-page"
      mountOnEnter
      unmountOnExit
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={DataSourceDetailsTab.DETAILS}
        title={<TabTitleText>{DataSourceDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Data source details tab"
        data-testid="data-source-details-tab"
      >
        <PageSection hasBodyWrapper={false} data-testid="data-source-details-tab-content">
          <DataSourceDetailsView dataSource={dataSource} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={DataSourceDetailsTab.FEATURE_VIEWS}
        title={<TabTitleText>{DataSourceDetailsTab.FEATURE_VIEWS}</TabTitleText>}
        aria-label="data source feature views tab"
        data-testid="data-source-feature-views-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="data-source-feature-views-tab-content"
          isWidthLimited
          style={{ maxWidth: '75%' }}
        >
          {featureViewsLoaded ? (
            featureViewsWithServices.length > 0 ? (
              <>
                <Title headingLevel="h3" data-testid="feature-view-lineage">
                  Feature views
                </Title>
                <FeatureViewsTabContent
                  featureViewsWithServices={featureViewsWithServices}
                  currentProject={currentProject ?? ''}
                />
              </>
            ) : (
              emptyState
            )
          ) : (
            <Bullseye>
              <Spinner size="xl" data-testid="loading-spinner" />
            </Bullseye>
          )}
        </PageSection>
      </Tab>
      {dataSource.type === 'REQUEST_SOURCE' && (
        <Tab
          eventKey={DataSourceDetailsTab.SCHEMA}
          title={<TabTitleText>{DataSourceDetailsTab.SCHEMA}</TabTitleText>}
          aria-label="data source schema tab"
          data-testid="data-source-schema-tab"
        >
          <PageSection
            hasBodyWrapper={false}
            isFilled
            data-testid="data-source-schema-tab-content"
            isWidthLimited
            style={{ maxWidth: '75%' }}
          >
            <SchemaTabContent dataSource={dataSource} />
          </PageSection>
        </Tab>
      )}
    </Tabs>
  );
};

export default DataSourceDetailsTabs;
