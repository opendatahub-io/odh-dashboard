import * as React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteCategories from '~/app/components/CuratedSuiteCategories';

// Show five suites so the create-suite card occupies the sixth slot in the preview gallery.
const MAX_VISIBLE_BENCHMARK_SUITES = 5;

type EvaluateTabProps = {
  namespace: string;
};

function handleCreateSuite(): void {
  // TODO: Redirect to the Create collections form.
}

const EvaluateTab: React.FC<EvaluateTabProps> = ({ namespace }) => (
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
      <BenchmarkSuitesGallery
        namespace={namespace}
        maxVisibleCollections={MAX_VISIBLE_BENCHMARK_SUITES}
        showSummary
        onCreateSuite={handleCreateSuite}
      />
    </StackItem>
    <StackItem className="evalhub-evaluate-tab__curated">
      <CuratedSuiteCategories namespace={namespace} />
    </StackItem>
  </Stack>
);

export default EvaluateTab;
