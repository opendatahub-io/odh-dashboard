import {
  Flex,
  FlexItem,
  PageSection,
  Title,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Content,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { FeatureView, OnDemandFeatureView } from '../../../types/featureView';
import FeatureStoreCodeBlock from '../../../components/FeatureStoreCodeBlock';
import { featureDataSourceRoute } from '../../../routes';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { formatOnDemandFeatureViewSources } from '../utils';

type FeatureViewTransformationProps = {
  featureView: FeatureView;
};

type DetailsItemProps = {
  label: string;
  value: string;
  testId?: string;
  className?: string;
  project?: string;
};

const DetailsItem: React.FC<DetailsItemProps> = ({ label, value, testId, className, project }) => (
  <DescriptionListGroup>
    <DescriptionListTerm data-testid={testId ? `${testId}-label` : undefined}>
      {label}
    </DescriptionListTerm>
    <DescriptionListDescription
      data-testid={testId ? `${testId}-value` : undefined}
      className={className}
    >
      <Link to={featureDataSourceRoute(project ?? '', value)}>{value}</Link>
    </DescriptionListDescription>
  </DescriptionListGroup>
);

const isOnDemandFeatureView = (featureView: FeatureView): featureView is OnDemandFeatureView =>
  featureView.type === 'onDemandFeatureView';

const FeatureViewTransformation: React.FC<FeatureViewTransformationProps> = ({ featureView }) => {
  const hasFeatureTransformation =
    isOnDemandFeatureView(featureView) &&
    featureView.spec.featureTransformation.userDefinedFunction;
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
          <Title
            headingLevel="h3"
            data-testid="feature-view-transformation"
            style={{ margin: '1em 0' }}
          >
            Transformation
          </Title>
          {hasFeatureTransformation && isOnDemandFeatureView(featureView) ? (
            <FeatureStoreCodeBlock
              lang={featureView.spec.mode}
              content={featureView.spec.featureTransformation.userDefinedFunction.bodyText}
              id={featureView.spec.name}
            />
          ) : (
            <Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ padding: '1rem' }}>
              <FlexItem>
                <Content className={text.textColorDisabled}>
                  {!isOnDemandFeatureView(featureView)
                    ? 'No transformation available for this feature view type'
                    : 'No transformation data available'}
                </Content>
              </FlexItem>
            </Flex>
          )}
        </FlexItem>
        <FlexItem>
          <Title headingLevel="h3" data-testid="feature-view-inputs" style={{ margin: '1em 0' }}>
            Inputs
          </Title>
          {isOnDemandFeatureView(featureView) ? (
            <div>
              <DescriptionList
                isHorizontal
                horizontalTermWidthModifier={{ default: '15ch', lg: '18ch', xl: '22ch' }}
              >
                {formatOnDemandFeatureViewSources(featureView.spec.sources).map((source) => (
                  <div key={source.sourceKey} style={{ marginBottom: '2rem' }}>
                    <DetailsItem
                      label={
                        source.sourceType === 'requestDataSource'
                          ? `Request Data Source`
                          : `Feature View Projection`
                      }
                      value={source.name}
                      project={currentProject ?? ''}
                      testId={`feature-view-inputs-${source.sourceKey}`}
                    />
                    {source.sourceType === 'requestDataSource' && source.schema && (
                      <div style={{ marginTop: '1rem' }}>
                        <Table aria-label={`Schema for ${source.sourceKey}`} variant="compact">
                          <Thead>
                            <Tr>
                              <Th>Field Name</Th>
                              <Th>Type</Th>
                              <Th>Description</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {source.schema.map((field, fieldIndex) => (
                              <Tr key={fieldIndex}>
                                <Td>{field.name}</Td>
                                <Td>{field.valueType}</Td>
                                <Td>{field.description || '-'}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </div>
                    )}
                    {source.sourceType === 'featureViewProjection' && source.features && (
                      <div style={{ marginTop: '1rem' }}>
                        <Table aria-label={`Features for ${source.sourceKey}`} variant="compact">
                          <Thead>
                            <Tr>
                              <Th>Feature Name</Th>
                              <Th>Type</Th>
                              <Th>Description</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {source.features.map((feature, featureIndex) => (
                              <Tr key={featureIndex}>
                                <Td>{feature.name}</Td>
                                <Td>{feature.valueType}</Td>
                                <Td>{feature.description || '-'}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </DescriptionList>
            </div>
          ) : (
            <Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ padding: '1rem' }}>
              <FlexItem>
                <Content className={text.textColorDisabled}>
                  No inputs available for this feature view type
                </Content>
              </FlexItem>
            </Flex>
          )}
        </FlexItem>
      </Flex>
    </PageSection>
  );
};

export default FeatureViewTransformation;
