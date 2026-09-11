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
import { evaluationBenchmarksRoute, evaluationCreateSuiteRoute } from '~/app/routes';
import type { Collection } from '~/app/types';

// Show five suites so the create-suite card occupies the sixth slot in the preview gallery.
const MAX_VISIBLE_BENCHMARK_SUITES = 5;

type EvaluateTabProps = {
  namespace: string;
  onSelectCollection: (collection: Collection) => void;
  onRunCollection: (collection: Collection) => void;
  onDuplicateCollection: (collection: Collection) => void;
};

const EvaluateTab: React.FC<EvaluateTabProps> = ({
  namespace,
  onSelectCollection,
  onRunCollection,
  onDuplicateCollection,
}) => (
  <>
    <Stack
      className="evalhub-evaluations-tab-content evalhub-evaluate-tab"
      data-testid="evaluate-tab-content"
    >
      <StackItem>
        <Title headingLevel="h2" size="lg">
          My benchmark suites
        </Title>
      </StackItem>
      <StackItem>
        {/* Use the real tenant collections API on the front page. */}
        <BenchmarkSuitesGallery
          namespace={namespace}
          maxVisibleCollections={MAX_VISIBLE_BENCHMARK_SUITES}
          showSummary
          useMockFallback={false}
          createSuiteRoute={evaluationCreateSuiteRoute(namespace)}
          onPrimaryAction={onRunCollection}
          onDuplicateCollection={onDuplicateCollection}
          onSelectCollection={onSelectCollection}
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

export default EvaluateTab;
