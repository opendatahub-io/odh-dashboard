/* eslint-disable camelcase */
import * as React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
  Label,
  Title,
} from '@patternfly/react-core';
import { formatCategory } from '~/app/components/benchmarkUtils';
import CollectionBenchmarkReviewList from '~/app/components/collectionBuilder/CollectionBenchmarkReviewList';
import type { Collection, CollectionBenchmark, Provider } from '~/app/types';
import type { CollectionBuilderFormValues } from '~/app/schemas/collectionBuilder.schema';

type GenerationSettings = Pick<
  CollectionBuilderFormValues,
  'generatorModel' | 'strictness' | 'generationEffort' | 'frameworkFilter'
>;

type CollectionReviewStepProps = {
  collection: Pick<
    Collection,
    'name' | 'description' | 'category' | 'domains' | 'evaluation_targets' | 'benchmarks'
  >;
  providers: Provider[];
  generationSettings?: GenerationSettings;
};

const CollectionReviewStep: React.FC<CollectionReviewStepProps> = ({
  collection,
  providers,
  generationSettings,
}) => {
  const isAiFlow = generationSettings !== undefined;
  const categories = collection.domains?.length
    ? collection.domains
    : collection.category
      ? [collection.category]
      : [];
  const category = isAiFlow ? (
    categories.length > 0 ? (
      categories.map(formatCategory).join(', ')
    ) : undefined
  ) : categories.length > 0 ? (
    <div className="pf-v6-u-display-flex pf-v6-u-flex-wrap pf-v6-u-gap-sm">
      {categories.map((item) => (
        <Label key={item}>{formatCategory(item)}</Label>
      ))}
    </div>
  ) : (
    '—'
  );
  const testId = isAiFlow ? 'goal-suite-review-step' : 'copy-suite-review-step';
  const testIdPrefix = isAiFlow ? 'goal-suite-review' : 'copy-suite-review';

  let generationSettingsContent: React.ReactNode;
  if (generationSettings) {
    const { generatorModel, strictness, generationEffort, frameworkFilter } = generationSettings;
    const strictnessLabel =
      strictness === 'lenient'
        ? 'Include related areas'
        : strictness === 'strict'
          ? 'Direct matches'
          : 'Balanced';
    const generationEffortLabel =
      generationEffort === 'low'
        ? 'Quick review'
        : generationEffort === 'high'
          ? 'Thorough review'
          : 'Balanced';
    const frameworkLabels = frameworkFilter.map((providerId) => {
      const provider = providers.find((item) => item.resource.id === providerId);
      return provider?.title ?? provider?.name ?? providerId;
    });

    generationSettingsContent = (
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTerm>Recommendation model</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-model">
            {generatorModel?.name || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Recommendation strictness</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-strictness">
            {strictnessLabel}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Recommendation depth</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-effort">
            {generationEffortLabel}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Framework</DescriptionListTerm>
          <DescriptionListDescription data-testid="goal-suite-review-frameworks">
            {frameworkLabels.length > 0 ? frameworkLabels.join(', ') : 'All frameworks'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    );
  }

  const displayedName = isAiFlow ? collection.name.trim() : collection.name || '—';
  const displayedDescription = isAiFlow
    ? collection.description?.trim() || '—'
    : collection.description || '—';
  const evaluates = isAiFlow
    ? 'Model'
    : collection.evaluation_targets?.length
      ? collection.evaluation_targets.map(formatCategory).join(', ')
      : '—';
  const benchmarks: CollectionBenchmark[] = collection.benchmarks ?? [];

  return (
    <div data-testid={testId}>
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
        Review
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        Check the collection details and benchmark settings before saving or running the collection.
      </Content>
      <Grid hasGutter className="pf-v6-u-mb-lg">
        <GridItem sm={12} lg={6}>
          <Title headingLevel="h3" className="pf-v6-u-mb-lg">
            Collection details
          </Title>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Name</DescriptionListTerm>
              <DescriptionListDescription data-testid={`${testIdPrefix}-name`}>
                {displayedName}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription data-testid={`${testIdPrefix}-description`}>
                {displayedDescription}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {category !== undefined ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Category</DescriptionListTerm>
                <DescriptionListDescription
                  data-testid={
                    isAiFlow ? 'goal-suite-review-category' : 'copy-suite-review-categories'
                  }
                >
                  {category}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
            <DescriptionListGroup>
              <DescriptionListTerm>Evaluates</DescriptionListTerm>
              <DescriptionListDescription data-testid={`${testIdPrefix}-evaluates`}>
                {evaluates}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </GridItem>
        {generationSettingsContent !== undefined ? (
          <GridItem sm={12} lg={6}>
            <Title headingLevel="h3" className="pf-v6-u-mb-lg">
              Generation settings
            </Title>
            {generationSettingsContent}
          </GridItem>
        ) : null}
      </Grid>
      <CollectionBenchmarkReviewList
        benchmarks={benchmarks}
        providers={providers}
        testIdPrefix={testIdPrefix}
        includeParameters={!isAiFlow}
      />
    </div>
  );
};

export default CollectionReviewStep;
/* eslint-enable camelcase */
