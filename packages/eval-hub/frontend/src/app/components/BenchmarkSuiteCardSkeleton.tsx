import * as React from 'react';
import {
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Flex,
  FlexItem,
  Skeleton,
} from '@patternfly/react-core';
import './BenchmarkSuiteCard.scss';

const BenchmarkSuiteCardSkeleton: React.FC = () => (
  <Card
    className="evalhub-benchmark-suite-card evalhub-benchmark-suite-card--loading"
    isFullHeight
    data-testid="benchmark-suite-card-loading"
    aria-busy="true"
  >
    <CardTitle className="evalhub-benchmark-suite-card__title">
      <div className="evalhub-benchmark-suite-card__title-content">
        <div
          className="evalhub-benchmark-suite-card__domain-icon evalhub-benchmark-suite-card__domain-icon--loading"
          aria-hidden="true"
        />
        <Skeleton width="7rem" screenreaderText="Loading collection" />
      </div>
      <Skeleton
        className="evalhub-benchmark-suite-card__loading-title"
        width="90%"
        height="1.5rem"
        aria-hidden="true"
      />
    </CardTitle>
    <CardBody className="evalhub-benchmark-suite-card__body">
      <Skeleton width="60%" aria-hidden="true" />
      <div className="evalhub-benchmark-suite-card__loading-description" aria-hidden="true">
        <Skeleton width="100%" />
        <Skeleton width="95%" />
        <Skeleton width="88%" />
        <Skeleton width="72%" />
      </div>
    </CardBody>
    <CardFooter className="evalhub-benchmark-suite-card__footer">
      <Flex
        className="evalhub-benchmark-suite-card__footer-metrics evalhub-benchmark-suite-card__loading-metrics"
        aria-hidden="true"
      >
        <FlexItem>
          <Skeleton width="4.5rem" height="1.5rem" />
        </FlexItem>
        <FlexItem>
          <Skeleton width="5.5rem" height="1.5rem" />
        </FlexItem>
      </Flex>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        className="evalhub-benchmark-suite-card__footer-content"
        aria-hidden="true"
      >
        <Skeleton width="4.5rem" height="2.25rem" />
        <Skeleton width="4rem" />
      </Flex>
    </CardFooter>
  </Card>
);

export default BenchmarkSuiteCardSkeleton;
