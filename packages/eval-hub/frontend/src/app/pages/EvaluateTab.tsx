import * as React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteCategories from '~/app/components/CuratedSuiteCategories';
import type { Collection } from '~/app/types';

// Show five suites so the create-suite card occupies the sixth slot in the preview gallery.
const MAX_VISIBLE_BENCHMARK_SUITES = 5;

type EvaluateTabProps = {
  namespace: string;
  onSelectCollection: (collection: Collection) => void;
};

function handleCreateSuite(): void {
  // TODO: Redirect to the Create collections form.
}

const EvaluateTab: React.FC<EvaluateTabProps> = ({ namespace, onSelectCollection }) => (
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
        onCreateSuite={handleCreateSuite}
        onSelectCollection={onSelectCollection}
      />
    </StackItem>
    <StackItem className="evalhub-evaluate-tab__curated">
      <CuratedSuiteCategories namespace={namespace} />
    </StackItem>
  </Stack>
);

export default EvaluateTab;
