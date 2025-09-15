import {
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  PageSection,
  Title,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { Link } from 'react-router-dom';
import React from 'react';
import { hasContent } from '../../../const';
import { DataSource } from '../../../types/dataSources';
import FeatureStoreCodeBlock from '../../../components/FeatureStoreCodeBlock';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';

import { featureDataSourceRoute } from '../../../routes';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';

type DetailsItemProps = {
  label: string;
  value: React.ReactNode;
  testId?: string;
  className?: string;
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

type DataSourceDetailsViewProps = {
  dataSource: DataSource;
};
const getDisabledClassName = (value: string | undefined) =>
  value && hasContent(value) ? '' : text.textColorDisabled;

const getContentValue = (value: string | undefined, fallback: string) =>
  value && hasContent(value) ? value : fallback;

const DataSourceDetailsView: React.FC<DataSourceDetailsViewProps> = ({ dataSource }) => {
  const { currentProject } = useFeatureStoreProject();
  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      isWidthLimited
      style={{ maxWidth: '75%' }}
    >
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItems2xl' }}>
        <FlexItem>
          <DescriptionList
            isCompact
            isHorizontal
            horizontalTermWidthModifier={{ default: '15ch', lg: '18ch', xl: '22ch' }}
          >
            <DetailsItem
              label="Data source connector"
              value={getContentValue(dataSource.type, 'No data source connector')}
              testId="data-source-connector"
              className={getDisabledClassName(dataSource.type)}
            />
            {dataSource.fileOptions?.uri && (
              <DetailsItem
                label="File URL"
                value={
                  <ClipboardCopy
                    hoverTip="Copy"
                    clickTip="Copied"
                    variant={ClipboardCopyVariant.inlineCompact}
                    style={{
                      backgroundColor: 'transparent',
                      padding: '0',
                    }}
                  >
                    {dataSource.fileOptions.uri}
                  </ClipboardCopy>
                }
                testId="data-source-file-url"
                className={getDisabledClassName(dataSource.fileOptions.uri)}
              />
            )}
            <DetailsItem
              label="Last modified"
              value={
                dataSource.meta.lastUpdatedTimestamp ? (
                  <FeatureStoreTimestamp date={new Date(dataSource.meta.lastUpdatedTimestamp)} />
                ) : (
                  'No last modified'
                )
              }
              testId="data-source-last-modified"
              className={getDisabledClassName(dataSource.meta.lastUpdatedTimestamp)}
            />
            <DetailsItem
              label="Created"
              value={
                dataSource.meta.createdTimestamp ? (
                  <FeatureStoreTimestamp date={new Date(dataSource.meta.createdTimestamp)} />
                ) : (
                  'No created date'
                )
              }
              testId="data-source-created"
              className={getDisabledClassName(dataSource.meta.createdTimestamp)}
            />
            <DetailsItem
              label="Owner"
              value={getContentValue(dataSource.owner, 'No owner')}
              testId="data-source-owner"
              className={getDisabledClassName(dataSource.owner)}
            />
            {dataSource.type === 'STREAM_KAFKA' && (
              <DetailsItem
                label="Batch data source"
                value={
                  dataSource.batchSource?.name && currentProject ? (
                    <Link to={featureDataSourceRoute(dataSource.batchSource.name, currentProject)}>
                      {dataSource.batchSource.name}
                    </Link>
                  ) : (
                    'No batch data source'
                  )
                }
                testId="data-source-batch-data-source"
                className={getDisabledClassName(dataSource.batchSource?.name)}
              />
            )}
          </DescriptionList>
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="data-source-interactive-example"
            style={{ margin: '1em 0' }}
          >
            Interactive example
          </Title>
          {dataSource.featureDefinition && (
            <FeatureStoreCodeBlock content={dataSource.featureDefinition} id={dataSource.name} />
          )}
        </FlexItem>
      </Flex>
    </PageSection>
  );
};

export default DataSourceDetailsView;
