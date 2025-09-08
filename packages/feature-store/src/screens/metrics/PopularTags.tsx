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
import { EMPTY_STATE_MESSAGES } from './const';
import useMetricsPopularTags from '../../apiHooks/useMetricsPopularTags';
import { featureViewRoute } from '../../routes';
import { PopularTag } from '../../types/metrics';

type PopularTagsProps = {
  project?: string;
  limit: number;
};

const PopularTagCard = ({ tag }: { tag: PopularTag }) => {
  return (
    <Card
      isFullHeight
      data-testid={`feature-store-popular-tag-card-${tag.tag_key}-${tag.tag_value}`}
    >
      <CardHeader>
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem>
            <TagIcon />
          </FlexItem>
          <FlexItem>
            <CardTitle>{`${tag.tag_key}=${tag.tag_value}`}</CardTitle>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody style={{ paddingBottom: '16px' }}>
        <Content component={ContentVariants.p} style={{ margin: '0' }}>
          Feature Views:
        </Content>
        <List
          className="pf-u-ps-sm"
          style={{
            margin: 0,
            gap: 'var(--pf-t--global--spacer--xs)',
          }}
        >
          {tag.feature_views.slice(0, 5).map((featureView, index) => (
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
          to="/featureStore/featureViews"
          aria-label={`View all ${tag.total_feature_views} feature views for ${tag.tag_key}: ${tag.tag_value}`}
        >
          View all ({tag.total_feature_views})
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
              <Skeleton width="100%" height="1.5rem" />
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
        <Content component={ContentVariants.p} data-testid="error-loading-popular-tags">
          Error loading popular tags
        </Content>
      );
    }

    if (!loaded) {
      return (
        <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <PopularTagsSkeleton />
          </FlexItem>
          <FlexItem>
            <PopularTagsSkeleton />
          </FlexItem>
        </Flex>
      );
    }

    if (data.popular_tags.length === 0) {
      return emptyState;
    }

    return (
      <Gallery hasGutter>
        {data.popular_tags.map((tag: PopularTag, index: number) => (
          <GalleryItem key={`${tag.tag_key}-${tag.tag_value}-${index}`}>
            <PopularTagCard tag={tag} />
          </GalleryItem>
        ))}
      </Gallery>
    );
  };

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <Title headingLevel="h3" data-testid="popular-tags-title">
        Discover feature views by popular tags
      </Title>
      {renderContent()}
    </Flex>
  );
};

export default PopularTags;
