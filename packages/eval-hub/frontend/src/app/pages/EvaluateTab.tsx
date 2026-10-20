import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteCategories from '~/app/components/CuratedSuiteCategories';
import {
  evaluationBenchmarksRoute,
  evaluationBenchmarkSuitesRoute,
  evaluationCreateSuiteRoute,
  evaluationEvaluateNavigationState,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import type { BenchmarkNameMap } from '~/app/components/benchmarkUtils';

const MAX_VISIBLE_BENCHMARK_SUITES = 5;

type EvaluateTabProps = {
  namespace: string;
  benchmarkNameMap: BenchmarkNameMap;
  onSelectCollection: (collection: Collection) => void;
  onRunCollection: (collection: Collection) => void;
  onEditCollection: (collection: Collection) => void;
  onDuplicateCollection: (collection: Collection) => void;
};

const EvaluateTab: React.FC<EvaluateTabProps> = ({
  namespace,
  benchmarkNameMap,
  onSelectCollection,
  onRunCollection,
  onEditCollection,
  onDuplicateCollection,
}) => {
  const [collectionCount, setCollectionCount] = React.useState(0);

  return (
    <>
      <Stack
        className="evalhub-evaluations-tab-content evalhub-evaluate-tab"
        data-testid="evaluate-tab-content"
      >
        <StackItem>
          <Flex
            className="pf-v6-u-pr-lg"
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            gap={{ default: 'gapMd' }}
          >
            {/* TODO: This preview count is capped at 200 until API-side created_at filtering is available. */}
            <Title headingLevel="h2" size="lg">
              My benchmark collections{collectionCount > 0 ? ` (${collectionCount})` : ''}
            </Title>
            <Button
              variant="primary"
              component={(props) => (
                <Link {...props} to={evaluationBenchmarkSuitesRoute(namespace)} />
              )}
              data-testid="benchmark-suites-view-all"
            >
              View all
            </Button>
          </Flex>
        </StackItem>
        <StackItem>
          {/* Use the real tenant collections API on the front page. */}
          <BenchmarkSuitesGallery
            namespace={namespace}
            benchmarkNameMap={benchmarkNameMap}
            maxVisibleCollections={MAX_VISIBLE_BENCHMARK_SUITES}
            useMockFallback={false}
            primaryActionLabel="Run"
            createSuiteRoute={evaluationCreateSuiteRoute(namespace)}
            createSuiteRouteState={evaluationEvaluateNavigationState}
            onPrimaryAction={onRunCollection}
            onEditCollection={onEditCollection}
            onDuplicateCollection={onDuplicateCollection}
            onSelectCollection={onSelectCollection}
            onCollectionCountChange={setCollectionCount}
          />
        </StackItem>
        <StackItem>
          <Card
            className="evalhub-browse-benchmarks-card"
            variant="secondary"
            data-testid="browse-all-benchmarks"
          >
            <CardBody>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                gap={{ default: 'gapMd' }}
              >
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Title
                    headingLevel="h2"
                    size="xl"
                    className="evalhub-browse-benchmarks-card__title"
                  >
                    Browse all benchmarks
                  </Title>
                  <Content component="p" className="evalhub-browse-benchmarks-card__description">
                    Explore 100+ individual benchmarks across all evaluation frameworks to run a
                    one-off evaluation.
                  </Content>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    component={(props) => (
                      <Link {...props} to={evaluationBenchmarksRoute(namespace)} />
                    )}
                    data-testid="browse-all-benchmarks-explore"
                  >
                    Explore
                  </Button>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        </StackItem>
        <StackItem className="evalhub-evaluate-tab__curated">
          <CuratedSuiteCategories namespace={namespace} />
        </StackItem>
      </Stack>
    </>
  );
};

export default EvaluateTab;
