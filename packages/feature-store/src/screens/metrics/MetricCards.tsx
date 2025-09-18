import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  ContentVariants,
  Flex,
  Gallery,
  GalleryItem,
  Skeleton,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import TruncatedText from '@odh-dashboard/internal/components/TruncatedText';
import { MetricCardItem, processMetricsData } from './utils';
import { MetricsCountResponse } from '../../types/metrics';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import { getFeatureStoreObjectTypeFromTitle } from '../../utils';

type MetricCardsProps = {
  metricsData?: MetricsCountResponse;
  loaded: boolean;
};

const MetricCard = ({ item, loaded }: { item: MetricCardItem; loaded: boolean }) => {
  const totalCount = item.count;
  return (
    <Card isFullHeight data-testid={`feature-store-metrics-card-${item.title.toLowerCase()}`}>
      <CardHeader>
        <CardTitle>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FeatureStoreObjectIcon
              objectType={getFeatureStoreObjectTypeFromTitle(item.title)}
              size={40}
              useTypedColors
            />
            <Truncate content={item.title} />
          </Flex>
        </CardTitle>
        <Content component={ContentVariants.small} style={{ marginTop: '5px' }}>
          <TruncatedText maxLines={3} content={item.description} />
        </Content>
      </CardHeader>
      <CardBody style={{ paddingBottom: '16px' }}>
        <Stack hasGutter={false}>
          <StackItem isFilled />
          <StackItem>
            {loaded ? (
              <Content style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalCount}</Content>
            ) : (
              <Skeleton width="15%" height="1.5rem" />
            )}
          </StackItem>
        </Stack>
      </CardBody>
      <CardFooter>
        {loaded ? (
          totalCount > 0 ? (
            <Link to={item.route} aria-label={`Go to ${item.title} page`}>
              Go to <b>{item.title}</b>
            </Link>
          ) : (
            <Content component={ContentVariants.p}>No available {item.title.toLowerCase()}</Content>
          )
        ) : (
          <Skeleton width="75%" height="1.5rem" />
        )}
      </CardFooter>
    </Card>
  );
};

const MetricCards: React.FC<MetricCardsProps> = ({ metricsData, loaded }) => {
  const metricItems = React.useMemo(
    () => (metricsData ? processMetricsData(metricsData) : []),
    [metricsData],
  );

  return (
    <Gallery hasGutter>
      {metricItems.map((item: MetricCardItem) => (
        <GalleryItem key={item.title}>
          <MetricCard item={item} loaded={loaded} />
        </GalleryItem>
      ))}
    </Gallery>
  );
};

export default MetricCards;
