import React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import FeatureStoreTimestamp from '#~/pages/featureStore/components/FeatureStoreTimestamp.tsx';
import { featureEntityRoute } from '#~/pages/featureStore/routes.ts';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags.tsx';
import FeatureStoreCodeBlock from '#~/pages/featureStore/components/FeatureStoreCodeBlock.tsx';
import { hasContent } from '#~/pages/featureStore/const';
import { countFeatures } from './utils';

type FeatureServiceDetailsPageProps = {
  featureService: FeatureService;
  fsProject?: string;
};

const FeatureServiceDetailsPage: React.FC<FeatureServiceDetailsPageProps> = ({
  featureService,
  fsProject,
}) => (
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
            <DescriptionListTerm data-testid="feature-overview-label">Overview</DescriptionListTerm>
            <DescriptionListDescription data-testid="feature-overview-value">
              <Label>{countFeatures(featureService) ?? 0} features</Label> from{' '}
              <Label>{featureService.spec.features?.length ?? 0} feature views</Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm data-testid="feature-created-at-label">
              Created at
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="feature-created-at-value">
              <FeatureStoreTimestamp date={featureService.meta.createdTimestamp} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm data-testid="feature-updated-at-label">
              Updated at
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="feature-updated-at-value">
              <FeatureStoreTimestamp date={featureService.meta.lastUpdatedTimestamp} />
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </FlexItem>

      <FlexItem>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
          <FlexItem>
            <Title headingLevel="h3" data-testid="entities-label">
              Entities
            </Title>
          </FlexItem>
          {featureService.relationships &&
          featureService.relationships.filter((rel) => rel.source.type === 'entity').length > 0 ? (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
                {featureService.relationships
                  .filter((rel) => rel.source.type === 'entity')
                  .map((rel) => rel.source.name)
                  .filter((name, idx, arr) => !!name && arr.indexOf(name) === idx)
                  .map((entityName) => (
                    <React.Fragment key={entityName}>
                      <FlexItem>
                        <Link to={featureEntityRoute(entityName, fsProject ?? '')}>
                          {entityName}
                        </Link>
                      </FlexItem>
                      <FlexItem>
                        <Divider />
                      </FlexItem>
                    </React.Fragment>
                  ))}
              </Flex>
            </FlexItem>
          ) : (
            <FlexItem>
              <Content component="p" className={text.textColorDisabled}>
                No entities
              </Content>
            </FlexItem>
          )}
        </Flex>
      </FlexItem>

      <FlexItem>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
          <FlexItem>
            <Title headingLevel="h3" data-testid="feature-tags">
              Tags
            </Title>
          </FlexItem>
          <FlexItem>
            {Object.keys(featureService.spec.tags ?? {}).length > 0 ? (
              <FeatureStoreTags tags={featureService.spec.tags ?? {}} showAllTags />
            ) : (
              <Content component="p" className={text.textColorDisabled}>
                No tags
              </Content>
            )}
          </FlexItem>
        </Flex>
      </FlexItem>

      {featureService.featureDefinition && (
        <FlexItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
            <FlexItem>
              <Title headingLevel="h3" data-testid="feature-interactive-example">
                Interactive example
              </Title>
            </FlexItem>
            <FlexItem>
              {hasContent(featureService.featureDefinition) ? (
                <FeatureStoreCodeBlock
                  content={featureService.featureDefinition}
                  id={featureService.spec.name}
                />
              ) : (
                <Content component="p" className={text.textColorDisabled}>
                  No interactive example
                </Content>
              )}
            </FlexItem>
          </Flex>
        </FlexItem>
      )}
    </Flex>
  </PageSection>
);

export default FeatureServiceDetailsPage;
