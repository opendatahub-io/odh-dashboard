import React from 'react';
import {
  ClipboardCopy,
  ClipboardCopyVariant,
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
import { Link } from 'react-router-dom';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import IndentSection from '@odh-dashboard/internal/pages/projects/components/IndentSection';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';
import { hasContent } from '../../../const';
import { DataSet } from '../../../types/dataSets';
import { getStorageConfig } from '../utils';
import FeatureStoreTags from '../../../components/FeatureStoreTags';
import { featureServiceRoute } from '../../../routes';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import FeatureStoreCodeBlock from '../../../components/FeatureStoreCodeBlock';

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

type DataSetDetailsViewProps = {
  dataSet: DataSet;
};

const getDisabledClassName = (value: string | undefined) =>
  value && hasContent(value) ? '' : text.textColorDisabled;

const getContentValue = (value: string | undefined, fallback: string) =>
  value && hasContent(value) ? value : fallback;

const getStorageType = (storage: DataSet['spec']['storage']): string => Object.keys(storage)[0];

const DataSetDetailsView: React.FC<DataSetDetailsViewProps> = ({ dataSet }) => {
  const { currentProject } = useFeatureStoreProject();
  const hasProject = dataSet.project || currentProject;
  const storageConfig = getStorageConfig(dataSet.spec.storage);
  const fileUri = typeof storageConfig.uri === 'string' ? storageConfig.uri : '';
  const featureServiceValue =
    dataSet.spec.featureServiceName && hasProject ? (
      <Link to={featureServiceRoute(dataSet.spec.featureServiceName, hasProject)}>
        {dataSet.spec.featureServiceName}
      </Link>
    ) : (
      'No source feature service'
    );
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
          <DescriptionList
            isCompact
            isHorizontal
            horizontalTermWidthModifier={{ default: '15ch', lg: '18ch', xl: '22ch' }}
          >
            <DetailsItem
              label="Source feature service"
              value={featureServiceValue}
              testId="data-set-source-feature-service"
              className={getDisabledClassName(dataSet.spec.featureServiceName)}
            />
            {Object.keys(dataSet.spec.storage).length > 0 && (
              <>
                <DetailsItem
                  label="Storage"
                  value={getContentValue(getStorageType(dataSet.spec.storage), 'No storage')}
                  testId="data-set-storage"
                  className={getDisabledClassName(getStorageType(dataSet.spec.storage))}
                />
                {/* {getStorageType(dataSet.spec.storage) === 'fileStorage' && (
                <DetailsItem
                  label="File format"
                  value={getContentValue(getFileFormat(dataSet.spec.storage), 'No file format')}
                  testId="data-set-file-format"
                  className={getDisabledClassName(getStorageType(dataSet.spec.storage))}
                />
              )} */}
                {typeof storageConfig.table === 'string' && storageConfig.table && (
                  <DetailsItem
                    label="Table"
                    value={getContentValue(storageConfig.table, 'No table')}
                    testId="data-set-table"
                    className={getDisabledClassName(storageConfig.table)}
                  />
                )}

                {typeof storageConfig.schema === 'string' && storageConfig.schema && (
                  <DetailsItem
                    label="Schema"
                    value={getContentValue(storageConfig.schema, 'No schema')}
                    testId="data-set-schema"
                    className={getDisabledClassName(storageConfig.schema)}
                  />
                )}

                {typeof storageConfig.database === 'string' && storageConfig.database && (
                  <DetailsItem
                    label="Database"
                    value={getContentValue(storageConfig.database, 'No database')}
                    testId="data-set-database"
                    className={getDisabledClassName(storageConfig.database)}
                  />
                )}

                {getStorageType(dataSet.spec.storage) === 'fileStorage' && hasContent(fileUri) && (
                  <DetailsItem
                    label="Path"
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
                        {fileUri}
                      </ClipboardCopy>
                    }
                    testId="data-set-storage-path"
                    className={getDisabledClassName(getStorageType(dataSet.spec.storage))}
                  />
                )}
                <DetailsItem
                  label="Last modified"
                  value={
                    dataSet.meta.lastUpdatedTimestamp ? (
                      <FeatureStoreTimestamp date={dataSet.meta.lastUpdatedTimestamp} />
                    ) : (
                      'No last modified'
                    )
                  }
                  testId="data-set-last-modified"
                  className={getDisabledClassName(dataSet.meta.lastUpdatedTimestamp)}
                />
                <DetailsItem
                  label="Created"
                  value={
                    dataSet.meta.createdTimestamp ? (
                      <FeatureStoreTimestamp date={dataSet.meta.createdTimestamp} />
                    ) : (
                      'No created'
                    )
                  }
                  testId="data-set-created-date"
                  className={getDisabledClassName(dataSet.meta.createdTimestamp)}
                />
              </>
            )}
          </DescriptionList>
        </FlexItem>
        <FlexItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
            <FlexItem>
              <Title headingLevel="h3" data-testid="feature-tags">
                Tags
              </Title>
            </FlexItem>
            <FlexItem>
              {dataSet.spec.tags && Object.keys(dataSet.spec.tags).length > 0 ? (
                <FeatureStoreTags tags={dataSet.spec.tags ?? {}} showAllTags />
              ) : (
                <Content className={text.textColorDisabled}>No tags</Content>
              )}
            </FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="data-set-join-keys-title"
            style={{ margin: '1em 0' }}
          >
            Join Keys
          </Title>

          {dataSet.spec.joinKeys.length > 0 ? (
            <Flex
              direction={{ default: 'column' }}
              spaceItems={{ default: 'spaceItemsSm' }}
              data-testid="data-set-join-keys"
            >
              {dataSet.spec.joinKeys.map((dSVal, index) => (
                <React.Fragment key={`${dSVal}-${index}`}>
                  <IndentSection>{dSVal}</IndentSection>
                  <Divider />
                </React.Fragment>
              ))}
            </Flex>
          ) : (
            <Content component="p" className={text.textColorDisabled}>
              No join keys
            </Content>
          )}
        </FlexItem>
        <FlexItem>
          <Title
            headingLevel="h3"
            data-testid="data-set-interactive-example-title"
            style={{ margin: '1em 0' }}
          >
            Interactive example
          </Title>
          {dataSet.featureDefinition ? (
            <FeatureStoreCodeBlock content={dataSet.featureDefinition} id={dataSet.spec.name} />
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

export default DataSetDetailsView;
