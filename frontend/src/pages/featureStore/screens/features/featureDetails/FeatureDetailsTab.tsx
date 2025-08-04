import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
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
import { Features } from '#~/pages/featureStore/types/features.ts';
import { FeatureDetailsTab } from '#~/pages/featureStore/screens/features/const';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags';
import FeatureStoreCodeBlock from '#~/pages/featureStore/components/FeatureStoreCodeBlock';
import { FeatureStoreSections, hasContent } from '#~/pages/featureStore/const.ts';
import FeatureStoreInfoTooltip from '#~/pages/featureStore/screens/components/FeatureStoreInfoTooltip';

type FeatureDetailsTabsProps = {
  feature: Features;
};

const FeatureDetailsTabs: React.FC<FeatureDetailsTabsProps> = ({ feature }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    FeatureDetailsTab.DETAILS,
  );

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
        <TabContentBody data-testid="feature-details-tab-content">
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
                      {FeatureStoreSections.VALUE_TYPE}
                    </DescriptionListTerm>
                    <DescriptionListDescription data-testid="feature-value-type">
                      {feature.type && hasContent(feature.type)
                        ? feature.type
                        : `No ${FeatureStoreSections.VALUE_TYPE.toLowerCase()}`}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </FlexItem>
              <FlexItem>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
                  <FlexItem>
                    <Title headingLevel="h3" data-testid="feature-tags">
                      {FeatureStoreSections.TAGS}
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    {feature.tags && Object.keys(feature.tags).length > 0 ? (
                      <FeatureStoreTags tags={feature.tags ?? {}} showAllTags />
                    ) : (
                      <Content>{`No ${FeatureStoreSections.TAGS.toLowerCase()}`}</Content>
                    )}
                  </FlexItem>
                </Flex>
              </FlexItem>
              {feature.featureDefinition && (
                <FlexItem>
                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
                    <FlexItem>
                      <Title headingLevel="h3" data-testid="feature-interactive-example">
                        {FeatureStoreSections.INTERACTIVE_EXAMPLE}
                      </Title>
                    </FlexItem>
                    <FlexItem>
                      {hasContent(feature.featureDefinition) ? (
                        <FeatureStoreCodeBlock
                          content={feature.featureDefinition}
                          id={feature.name}
                        />
                      ) : (
                        <Content>{`No ${FeatureStoreSections.INTERACTIVE_EXAMPLE.toLowerCase()}`}</Content>
                      )}
                    </FlexItem>
                  </Flex>
                </FlexItem>
              )}
            </Flex>
          </PageSection>
        </TabContentBody>
      </Tab>
      <Tab
        eventKey={FeatureDetailsTab.FEATURE_VIEWS}
        title={
          <>
            <TabTitleText>{FeatureDetailsTab.FEATURE_VIEWS}</TabTitleText>
            <FeatureStoreInfoTooltip>
              <Content>
                Feature views group related features and define how they&apos;re retrieved from a
                data source.
              </Content>
            </FeatureStoreInfoTooltip>
          </>
        }
        aria-label="Feature views tab"
        data-testid="feature-views-tab"
      >
        <TabContentBody data-testid="feature-views-tab-content">feature views</TabContentBody>
      </Tab>
    </Tabs>
  );
};

export default FeatureDetailsTabs;
