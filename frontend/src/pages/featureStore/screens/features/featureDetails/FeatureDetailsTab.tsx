import '#~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Flex,
  FlexItem,
  PageSection,
  Tab,
  TabContentBody,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router';
import { Features, FeatureRelationship } from '#~/pages/featureStore/types/features.ts';
import { FeatureDetailsTab } from '#~/pages/featureStore/screens/features/const';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags';
import FeatureStoreCodeBlock from '#~/pages/featureStore/components/FeatureStoreCodeBlock';

// Utility functions to extract information from relationships
const extractFeatureViewsFromRelationships = (relationships?: FeatureRelationship[]): string[] => {
  if (!relationships || !Array.isArray(relationships)) {
    return [];
  }

  const featureViews = new Set<string>();

  relationships.forEach((relationship) => {
    if (relationship.target.type === 'featureView') {
      featureViews.add(relationship.target.name);
    }
  });

  return Array.from(featureViews);
};

const extractFeatureServicesFromRelationships = (
  relationships?: FeatureRelationship[],
): string[] => {
  if (!relationships || !Array.isArray(relationships)) {
    return [];
  }

  const featureServices = new Set<string>();

  relationships.forEach((relationship) => {
    if (relationship.target.type === 'featureService') {
      featureServices.add(relationship.target.name);
    }
  });

  return Array.from(featureServices);
};

type FeatureDetailsTabsProps = {
  feature: Features;
};

const FeatureDetailsTabs: React.FC<FeatureDetailsTabsProps> = ({ feature }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    FeatureDetailsTab.DETAILS,
  );

  const featureViews = extractFeatureViewsFromRelationships(feature.relationships);
  const featureServices = extractFeatureServicesFromRelationships(feature.relationships);

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Feature details page"
      role="region"
      data-testid="feature-details-page"
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={FeatureDetailsTab.DETAILS}
        title={<TabTitleText>{FeatureDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Feature details tab"
        data-testid="feature-details-tab"
      >
        <TabContentBody data-testid="pipeline-parameter-tab">
          <PageSection
            isFilled
            padding={{ default: 'noPadding' }}
            hasBodyWrapper={false}
            style={{ maxWidth: '75%' }}
          >
            <Flex
              direction={{ default: 'column' }}
              spaceItems={{ default: 'spaceItems2xl' }}
              className="pf-v6-u-mt-xl"
            >
              <FlexItem>
                <DescriptionList isCompact isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm data-testid="feature-type-label">
                      Value Type
                    </DescriptionListTerm>
                    <DescriptionListDescription data-testid="feature-value-type">
                      {feature.type}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </FlexItem>

              {featureViews.length > 0 && (
                <FlexItem>
                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
                    <FlexItem>
                      <Title headingLevel="h3" data-testid="feature-views-label">
                        Feature Views
                      </Title>
                    </FlexItem>
                    <Flex
                      direction={{ default: 'column' }}
                      spaceItems={{ default: 'spaceItemsMd' }}
                    >
                      {featureViews.map((featureViewName) => (
                        <React.Fragment key={featureViewName}>
                          <FlexItem>
                            <Link to={`/featureStore/featureViews/${featureViewName}`}>
                              {featureViewName}
                            </Link>
                          </FlexItem>

                          <FlexItem>
                            <Divider />
                          </FlexItem>
                        </React.Fragment>
                      ))}
                    </Flex>
                  </Flex>
                </FlexItem>
              )}

              {featureServices.length > 0 && (
                <FlexItem>
                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
                    <FlexItem>
                      <Title headingLevel="h3" data-testid="feature-services-label">
                        Feature Services
                      </Title>
                    </FlexItem>
                    <Flex
                      direction={{ default: 'column' }}
                      spaceItems={{ default: 'spaceItemsMd' }}
                    >
                      {featureServices.map((featureServiceName) => (
                        <React.Fragment key={featureServiceName}>
                          <FlexItem>
                            <Link to={`/featureStore/featureServices/${featureServiceName}`}>
                              {featureServiceName}
                            </Link>
                          </FlexItem>
                          <FlexItem>
                            <Divider />
                          </FlexItem>
                        </React.Fragment>
                      ))}
                    </Flex>
                  </Flex>
                </FlexItem>
              )}

              <FlexItem>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
                  <FlexItem>
                    <Title headingLevel="h3" data-testid="feature-tags">
                      Tags
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <FeatureStoreTags tags={feature.tags ?? {}} />
                  </FlexItem>
                </Flex>
              </FlexItem>
              {feature.featureDefinition && (
                <FlexItem>
                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
                    <FlexItem>
                      <Title headingLevel="h3" data-testid="feature-interactive-example">
                        Interactive example
                      </Title>
                    </FlexItem>
                    <FlexItem>
                      <FeatureStoreCodeBlock
                        content={feature.featureDefinition}
                        id={feature.name}
                      />
                    </FlexItem>
                  </Flex>
                </FlexItem>
              )}
            </Flex>
          </PageSection>
        </TabContentBody>
      </Tab>
    </Tabs>
  );
};

export default FeatureDetailsTabs;
