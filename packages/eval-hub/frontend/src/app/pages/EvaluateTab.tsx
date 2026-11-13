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
import {
  evaluationBenchmarkSuitesRoute,
  evaluationCreateSuiteRoute,
  evaluationEvaluateNavigationState,
  evaluationSingleBenchmarkRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import type { BenchmarkNameMap } from '~/app/components/benchmarkUtils';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

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
  const heading = 'Recent benchmark collections';

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
            <Title headingLevel="h2" size="lg">
              {heading}
            </Title>
            <Button
              variant="primary"
              component={(props) => (
                <Link {...props} to={evaluationBenchmarkSuitesRoute(namespace)} />
              )}
              onClick={() =>
                trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_ALL_SUITES_OPENED, {
                  surface: 'my_benchmark_suites',
                })
              }
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
            trackingSurface="my_benchmark_suites"
            useMockFallback={false}
            primaryActionLabel="Run"
            createSuiteRoute={evaluationCreateSuiteRoute(namespace)}
            createSuiteRouteState={evaluationEvaluateNavigationState}
            onPrimaryAction={onRunCollection}
            onEditCollection={onEditCollection}
            onDuplicateCollection={onDuplicateCollection}
            onSelectCollection={onSelectCollection}
          />
        </StackItem>
        <StackItem>
          <Card className="evalhub-browse-benchmarks-card" data-testid="browse-all-benchmarks">
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
                    Run an individual benchmark
                  </Title>
                  <Content component="p" className="evalhub-browse-benchmarks-card__description">
                    Select a benchmark to evaluate an AI asset.
                  </Content>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    component={(props) => (
                      <Link
                        {...props}
                        to={evaluationSingleBenchmarkRoute(namespace)}
                        state={evaluationEvaluateNavigationState}
                      />
                    )}
                    onClick={() =>
                      trackEvalHubEvent(EVAL_HUB_EVENTS.BENCHMARK_CATALOG_OPENED, {
                        surface: 'my_benchmark_suites',
                      })
                    }
                    data-testid="browse-all-benchmarks-explore"
                  >
                    Browse benchmarks
                  </Button>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        </StackItem>
        {/* Red Hat validated collections are temporarily hidden until more evaluation targets are available. */}
      </Stack>
    </>
  );
};

export default EvaluateTab;
