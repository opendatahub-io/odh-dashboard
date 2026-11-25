/* eslint-disable camelcase */
import * as React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { formatCategory } from '~/app/components/benchmarkUtils';
import CollectionBenchmarkReviewList from '~/app/components/collectionBuilder/CollectionBenchmarkReviewList';
import { useProviders } from '~/app/hooks/useProviders';
import type { CollectionBenchmark, CollectionGenerationResult } from '~/app/types';

type GoalCollectionReviewStepProps = {
  generatedCollection: CollectionGenerationResult['collection'];
  suiteName: string;
  suiteDescription: string;
  selectedBenchmarks: CollectionBenchmark[];
  namespace: string;
};

const formatParameterLabel = (key: string): string => {
  const normalizedKey = key.toLowerCase().replace(/[-\s]+/g, '_');
  if (['samples', 'num_samples', 'sample_count'].includes(normalizedKey)) {
    return 'Samples';
  }
  if (['seed', 'random_seed'].includes(normalizedKey)) {
    return 'Random seed';
  }

  const readableKey = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return readableKey
    ? `${readableKey[0].toUpperCase()}${readableKey.slice(1)}`
    : key || 'Parameter';
};

const GoalCollectionReviewStep: React.FC<GoalCollectionReviewStepProps> = ({
  generatedCollection,
  suiteName,
  suiteDescription,
  selectedBenchmarks,
  namespace,
}) => {
  const { activeStep } = useWizardContext();
  const { providers } = useProviders(activeStep.id === 'review' ? namespace : '');
  const categories = generatedCollection.domains?.length
    ? generatedCollection.domains
    : generatedCollection.category
      ? [generatedCollection.category]
      : [];

  return (
    <div data-testid="goal-suite-review-step">
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
        Review
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        Check the collection details and benchmark settings before saving or running the collection.
      </Content>
      <Title headingLevel="h3" className="pf-v6-u-mb-md">
        Collection details
      </Title>
      <DescriptionList isHorizontal className="pf-v6-u-mb-lg">
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-name">
            {suiteName.trim()}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-description">
            {suiteDescription.trim() || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        {categories.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Categories</DescriptionListTerm>
            <DescriptionListDescription data-testid="goal-suite-review-categories">
              <div className="pf-v6-u-display-flex pf-v6-u-flex-wrap pf-v6-u-gap-sm">
                {categories.map((category) => (
                  <Label key={category}>{formatCategory(category)}</Label>
                ))}
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
        <DescriptionListGroup>
          <DescriptionListTerm>Evaluates</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-evaluates">
            Model
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      <CollectionBenchmarkReviewList
        benchmarks={selectedBenchmarks}
        providers={providers}
        formatParameterLabel={formatParameterLabel}
        testIdPrefix="goal-suite-review"
        providerClassName="evalhub-collection-generation-card__provider"
      />
    </div>
  );
};

export default GoalCollectionReviewStep;
/* eslint-enable camelcase */
