import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Flex,
  FlexItem,
  PageSection,
  Title,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import React from 'react';
import { Link } from 'react-router';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import IndentSection from '@odh-dashboard/internal/pages/projects/components/IndentSection';
import { FeatureView } from '../../../types/featureView';
import FeatureStoreLabels from '../../../components/FeatureStoreLabels';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';
import FeatureStoreTags from '../../../components/FeatureStoreTags';
import FeatureStoreCodeBlock from '../../../components/FeatureStoreCodeBlock';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { featureDataSourceRoute, featureEntityRoute } from '../../../routes';
import { hasContent } from '../../../const';
import { countRelationshipTypes, formatFeatureViewDataSources } from '../utils';

type DataSource = {
  sourceType: string;
  name: string;
  fileUrl: string;
  createdDate: string;
  lastModifiedDate: string;
};

type DataSourcesTableProps = {
  dataSources: DataSource[];
  currentProject: string;
};

type DetailsItemProps = {
  label: string;
  value: React.ReactNode;
  testId?: string;
  className?: string;
};

const DataSourcesTable: React.FC<DataSourcesTableProps> = ({ dataSources, currentProject }) => {
  if (dataSources.length === 0) {
    return <>-</>;
  }

  return (
    <Table
      aria-label="Data sources table"
      data-testid="feature-view-data-sources-table"
      variant="compact"
    >
      <Thead>
        <Tr>
          <Th width={20}>Source type</Th>
          <Th width={20}>Data source</Th>
          <Th>File URL</Th>
          <Th>Created Date</Th>
          <Th>Last Modified Date</Th>
        </Tr>
      </Thead>
      <Tbody>
        {dataSources.map((dataSource, index) => (
          <Tr key={index}>
            <Td>{dataSource.sourceType}</Td>
            <Td>
              {dataSource.name !== '-' ? (
                <Link to={featureDataSourceRoute(dataSource.name, currentProject)}>
                  {dataSource.name}
                </Link>
              ) : (
                <Content component="small" className={text.textColorDisabled}>
                  {dataSource.name}
                </Content>
              )}
            </Td>
            <Td>{dataSource.fileUrl}</Td>
            <Td>
              {dataSource.createdDate !== '-' ? (
                <FeatureStoreTimestamp date={dataSource.createdDate} />
              ) : (
                '-'
              )}
            </Td>
            <Td>
              {dataSource.lastModifiedDate !== '-' ? (
                <FeatureStoreTimestamp date={dataSource.lastModifiedDate} />
              ) : (
                '-'
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

const DetailsItem: React.FC<DetailsItemProps> = ({ label, value, testId, className }) => (
  <DescriptionListGroup>
    <DescriptionListTerm data-testid={testId ? `${testId}-label` : undefined}>
      {label}
    </DescriptionListTerm>
    <DescriptionListDescription
      data-testid={testId ? `${testId}-value` : undefined}
      className={className}
    >
      {value}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

type FeatureViewDetailsViewProps = {
  featureView: FeatureView;
};

const FeatureViewDetailsView: React.FC<FeatureViewDetailsViewProps> = ({ featureView }) => {
  const getDisabledClassName = (value: string | undefined) =>
    value && hasContent(value) ? '' : text.textColorDisabled;

  const featureViewsCount = countRelationshipTypes(featureView.relationships, [
    'feature',
    'dataSource',
    'featureView',
    'featureService',
  ]);

  const { currentProject } = useFeatureStoreProject();

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      isWidthLimited
      style={{ maxWidth: '75%' }}
    >
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItems2xl' }}
        className="pf-v6-u-mt-xl"
      >
        <FlexItem>
          <DescriptionList isCompact isHorizontal>
            <DetailsItem
              label="Overview"
              value={
                <>
                  <Flex direction={{ default: 'row' }} gap={{ default: 'gap' }}>
                    <FlexItem>
                      <FeatureStoreLabels color="grey">
                        {featureViewsCount.feature} feature
                        {featureViewsCount.feature > 1 ? 's' : ''}
                      </FeatureStoreLabels>
                    </FlexItem>
                    <FlexItem>
                      <FeatureStoreLabels color="grey">
                        {featureViewsCount.featureService} consuming service
                        {featureViewsCount.featureService > 1 ? 's' : ''}
                      </FeatureStoreLabels>
                    </FlexItem>
                  </Flex>
                </>
              }
              testId="overview-feature-view"
            />
            <DetailsItem
              label="Created"
              className={getDisabledClassName(featureView.meta.createdTimestamp)}
              value={
                featureView.meta.createdTimestamp &&
                hasContent(featureView.meta.createdTimestamp) ? (
                  <FeatureStoreTimestamp date={featureView.meta.createdTimestamp} />
                ) : (
                  '-'
                )
              }
              testId="feature-view-created-at"
            />
          </DescriptionList>
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="feature-view-data-sources-title"
            style={{ margin: '1em 0' }}
          >
            Data source
          </Title>
          {(() => {
            const dataSources = formatFeatureViewDataSources(featureView);
            return dataSources.length > 0 ? (
              <DataSourcesTable dataSources={dataSources} currentProject={currentProject ?? ''} />
            ) : (
              <>-</>
            );
          })()}
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="feature-view-entities-title"
            style={{ margin: '1em 0' }}
          >
            Entities
          </Title>
          {featureView.spec.entities.length > 0 ? (
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsNone' }}>
              {featureView.spec.entities.map((entity, index) => (
                <React.Fragment key={`${entity}-${index}`}>
                  <IndentSection>
                    <Link to={featureEntityRoute(entity, currentProject ?? '')}>{entity}</Link>
                  </IndentSection>
                  <Divider />
                </React.Fragment>
              ))}
            </Flex>
          ) : (
            <Content component="p" className={text.textColorDisabled}>
              No entities
            </Content>
          )}
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="feature-view-tags-title"
            style={{ margin: '1em 0' }}
          >
            Tags
          </Title>
          {featureView.spec.tags && Object.keys(featureView.spec.tags).length > 0 ? (
            <FeatureStoreTags tags={featureView.spec.tags ?? {}} showAllTags />
          ) : (
            <Content component="p" className={text.textColorDisabled}>
              No tags
            </Content>
          )}
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="feature-view-interactive-example-title"
            style={{ margin: '1em 0' }}
          >
            Interactive example
          </Title>
          {featureView.featureDefinition && hasContent(featureView.featureDefinition) ? (
            <FeatureStoreCodeBlock
              lang={featureView.spec.mode}
              content={featureView.featureDefinition}
              id={featureView.spec.name}
            />
          ) : (
            <Content component="p" className={text.textColorDisabled}>
              No interactive example
            </Content>
          )}
        </FlexItem>
      </Flex>
    </PageSection>
  );
};

export default FeatureViewDetailsView;
