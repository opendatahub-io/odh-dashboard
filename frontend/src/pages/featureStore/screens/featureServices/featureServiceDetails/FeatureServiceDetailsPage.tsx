import React from 'react';
import {
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
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import FeatureStoreTimestamp from '#~/pages/featureStore/components/FeatureStoreTimestamp.tsx';
import { featureEntityRoute } from '#~/pages/featureStore/routes.ts';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags.tsx';
import FeatureStoreCodeBlock from '#~/pages/featureStore/components/FeatureStoreCodeBlock.tsx';

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
              <Label>
                {featureService.spec.features?.reduce(
                  (acc, fv) => acc + (fv.featureColumns.length || 0),
                  0,
                )}{' '}
                features
              </Label>{' '}
              from <Label>{featureService.spec.features?.length} feature views</Label>
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

      {featureService.relationships &&
        featureService.relationships.filter((rel) => rel.source.type === 'entity').length > 0 && (
          <FlexItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
              <FlexItem>
                <Title headingLevel="h3" data-testid="entities-label">
                  Entities
                </Title>
              </FlexItem>
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
            <FeatureStoreTags tags={featureService.spec.tags ?? {}} threshold={10} />
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
              <FeatureStoreCodeBlock
                content={featureService.featureDefinition}
                id={featureService.spec.name}
              />
            </FlexItem>
          </Flex>
        </FlexItem>
      )}
    </Flex>
  </PageSection>
);

export default FeatureServiceDetailsPage;
