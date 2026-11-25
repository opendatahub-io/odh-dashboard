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
} from '@patternfly/react-core';
import { formatCategory, getBenchmarkParameterLabel } from '~/app/components/benchmarkUtils';
import CollectionBenchmarkReviewList from '~/app/components/collectionBuilder/CollectionBenchmarkReviewList';
import type { Collection, Provider } from '~/app/types';

type ManualCollectionReviewStepProps = {
  collection: Collection;
  providers: Provider[];
};

const ManualCollectionReviewStep: React.FC<ManualCollectionReviewStepProps> = ({
  collection,
  providers,
}) => {
  const categories = collection.domains?.length
    ? collection.domains
    : collection.category
      ? [collection.category]
      : [];
  const evaluationTargets = collection.evaluation_targets ?? [];

  return (
    <div data-testid="copy-suite-review-step">
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
          <DescriptionListDescription data-testid="copy-suite-review-name">
            {collection.name || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription data-testid="copy-suite-review-description">
            {collection.description || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Category</DescriptionListTerm>
          <DescriptionListDescription data-testid="copy-suite-review-categories">
            {categories.length > 0 ? (
              <div className="pf-v6-u-display-flex pf-v6-u-flex-wrap pf-v6-u-gap-sm">
                {categories.map((category) => (
                  <Label key={category}>{formatCategory(category)}</Label>
                ))}
              </div>
            ) : (
              '—'
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Evaluates</DescriptionListTerm>
          <DescriptionListDescription data-testid="copy-suite-review-evaluates">
            {evaluationTargets.length > 0 ? evaluationTargets.map(formatCategory).join(', ') : '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      <CollectionBenchmarkReviewList
        benchmarks={collection.benchmarks ?? []}
        providers={providers}
        formatParameterLabel={getBenchmarkParameterLabel}
        testIdPrefix="copy-suite-review"
        providerClassName="pf-v6-u-mb-0"
      />
    </div>
  );
};

export default ManualCollectionReviewStep;
/* eslint-enable camelcase */
