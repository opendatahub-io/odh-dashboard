import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  List,
  ListItem,
  Skeleton,
  Title,
} from '@patternfly/react-core';
import { PlusIcon, TagIcon } from '@patternfly/react-icons';
import React from 'react';
import { Link } from 'react-router-dom';
import TruncatedText from '@odh-dashboard/internal/components/TruncatedText';
import { EMPTY_STATE_MESSAGES } from './const';
import useMetricsPopularTags from '../../apiHooks/useMetricsPopularTags';
import { FeatureStoreObject } from '../../const';
import { featureStoreRoute, featureViewRoute } from '../../routes';
import { PopularTag } from '../../types/metrics';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';

type PopularTagsProps = {
  project?: string;
  limit: number;
};

const PopularTagCard = ({ tag }: { tag: PopularTag }) => {
  return (
    <Card isFullHeight data-testid={`feature-store-popular-tag-card-${tag.tagKey}-${tag.tagValue}`}>
      <CardHeader>
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem flex={{ default: 'flexNone' }}>
            <TagIcon />
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 0 }}>
            <CardTitle>
              <TruncatedText maxLines={1} content={`${tag.tagKey}=${tag.tagValue}`} />
            </CardTitle>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody style={{ paddingBottom: '16px' }}>
        <Content component={ContentVariants.p} style={{ margin: '0' }}>
          Feature views:
        </Content>
        <List
          className="pf-u-ps-sm"
          style={{
            margin: 0,
            gap: 'var(--pf-t--global--spacer--xs)',
          }}
        >
          {tag.featureViews.slice(0, 5).map((featureView, index) => (
            <ListItem key={`${featureView.name}-${featureView.project}-${index}`}>
              <Link
                to={featureViewRoute(featureView.name, featureView.project)}
                aria-label={`Go to ${featureView.name} feature view in ${featureView.project} project`}
              >
                {featureView.name}
              </Link>
            </ListItem>
          ))}
        </List>
      </CardBody>
      <CardFooter>
        <Link
          to={featureStoreRoute(FeatureStoreObject.FEATURE_VIEWS)}
          aria-label={`View all ${tag.totalFeatureViews} feature views for ${tag.tagKey}: ${tag.tagValue}`}
        >
          View all ({tag.totalFeatureViews})
        </Link>
      </CardFooter>
    </Card>
  );
};

const PopularTagsSkeleton = () => {
  const fontSize = 'var(--pf-t--global--font--size--body--sm)';
  return (
    <Gallery hasGutter>
      <GalleryItem>
        <Card>
          <CardHeader>
            <CardTitle>
              <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <TagIcon />
                <Skeleton width="88%" height="1.5rem" />
              </Flex>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <List>
              <ListItem>
                <Skeleton width="50%" style={{ fontSize }} />
              </ListItem>
              <ListItem>
                <Skeleton width="70%" style={{ fontSize }} />
              </ListItem>
              <ListItem>
                <Skeleton width="70%" style={{ fontSize }} />
              </ListItem>
            </List>
          </CardBody>
          <CardFooter>
            <Skeleton width="50%" style={{ fontSize }} />
          </CardFooter>
        </Card>
      </GalleryItem>
    </Gallery>
  );
};

const PopularTags: React.FC<PopularTagsProps> = ({ project, limit = 4 }) => {
  const { data, loaded, error } = useMetricsPopularTags({ project, limit });

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={PlusIcon}
      titleText={EMPTY_STATE_MESSAGES.POPULAR_TAGS}
      variant={EmptyStateVariant.lg}
      data-testid="popular-tags-empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        Create feature views in workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  const renderContent = () => {
    if (error) {
      return (
        <FeatureStoreAccessDenied
          testId="error-loading-popular-tags"
          resourceType="popular tags"
          title="Access permissions needed"
          description="You don't have permission to access the popular tags. Contact your admin to request access."
          headingLevel="h6"
          emptyStateVariant={EmptyStateVariant.xs}
        />
      );
    }

    if (!loaded) {
      return (
        <Gallery hasGutter>
          {[1, 2, 3, 4].map((item: number) => (
            <GalleryItem key={item}>
              <PopularTagsSkeleton />
            </GalleryItem>
          ))}
        </Gallery>
      );
    }

    if (data.popularTags.length === 0) {
      return emptyState;
    }

    return (
      <Gallery hasGutter>
        {data.popularTags.map((tag: PopularTag, index: number) => (
          <GalleryItem key={`${tag.tagKey}-${tag.tagValue}-${index}`}>
            <PopularTagCard tag={tag} />
          </GalleryItem>
        ))}
      </Gallery>
    );
  };

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <Title
        headingLevel="h3"
        data-testid="popular-tags-title"
        style={{ marginBottom: error ? '0' : '2rem' }}
      >
        Feature views using popular tags
      </Title>
      {renderContent()}
    </Flex>
  );
};

export default PopularTags;
