/* eslint-disable camelcase */
import * as React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  List,
  ListItem,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { getMetricDisplayName, formatCategory } from '~/app/components/benchmarkUtils';
import { useProviders } from '~/app/hooks/useProviders';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';
import { formatThresholdValue } from '~/app/utilities/evaluationUtils';
import type { CollectionBenchmark, CollectionGenerationResult } from '~/app/types';

type GoalSuiteReviewStepProps = {
  generatedCollection: CollectionGenerationResult['collection'];
  suiteName: string;
  suiteDescription: string;
  selectedBenchmarks: CollectionBenchmark[];
  namespace: string;
};

const formatParameterValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
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

const GoalSuiteReviewStep: React.FC<GoalSuiteReviewStepProps> = ({
  generatedCollection,
  suiteName,
  suiteDescription,
  selectedBenchmarks,
  namespace,
}) => {
  const { activeStep } = useWizardContext();
  const { providers } = useProviders(activeStep.id === 'review' ? namespace : '');
  const benchmarksByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);
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

      <Title headingLevel="h3" className="pf-v6-u-mb-md pf-v6-u-mt-lg">
        Benchmarks ({selectedBenchmarks.length})
      </Title>
      {selectedBenchmarks.length === 0 ? (
        <Content component="p">No benchmarks are selected.</Content>
      ) : (
        <List isPlain data-testid="goal-suite-review-benchmarks">
          {selectedBenchmarks.map((benchmark) => {
            const catalogBenchmark = benchmarksByKey.get(
              `${benchmark.provider_id ?? ''}:${benchmark.id}`,
            );
            const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
            const providerName = provider?.title || provider?.name || benchmark.provider_id;
            const parameters = Object.entries(benchmark.parameters ?? {});
            const hasDetails =
              Boolean(benchmark.primary_score?.metric) ||
              Boolean(benchmark.pass_criteria) ||
              parameters.length > 0;
            return (
              <ListItem
                key={`${benchmark.provider_id ?? ''}:${benchmark.id}`}
                className="pf-v6-u-mb-md"
              >
                <Card isCompact>
                  <CardTitle>
                    {catalogBenchmark?.name ?? benchmark.id}
                    <Content component="p" className="evalhub-collection-generation-card__provider">
                      {benchmark.id}
                      {providerName ? ` · ${providerName}` : ''}
                    </Content>
                  </CardTitle>
                  {hasDetails ? (
                    <CardBody data-testid="goal-suite-review-benchmark-details">
                      <DescriptionList isHorizontal isCompact className="pf-v6-u-mt-sm">
                        {benchmark.primary_score?.metric ? (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Primary metric</DescriptionListTerm>
                            <DescriptionListDescription>
                              {getMetricDisplayName(benchmark.primary_score.metric)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        ) : null}
                        {benchmark.pass_criteria ? (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Threshold</DescriptionListTerm>
                            <DescriptionListDescription>
                              {formatThresholdValue(
                                benchmark.pass_criteria.threshold,
                                benchmark.primary_score?.metric,
                              )}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        ) : null}
                        {parameters.map(([key, value]) => (
                          <DescriptionListGroup key={key}>
                            <DescriptionListTerm>{formatParameterLabel(key)}</DescriptionListTerm>
                            <DescriptionListDescription>
                              {formatParameterValue(value)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        ))}
                      </DescriptionList>
                    </CardBody>
                  ) : null}
                </Card>
              </ListItem>
            );
          })}
        </List>
      )}
    </div>
  );
};

export default GoalSuiteReviewStep;
/* eslint-enable camelcase */
