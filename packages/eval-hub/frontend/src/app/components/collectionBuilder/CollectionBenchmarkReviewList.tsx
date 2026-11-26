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
  Gallery,
  GalleryItem,
  Title,
} from '@patternfly/react-core';
import { getBenchmarkParameterLabel, getMetricDisplayName } from '~/app/components/benchmarkUtils';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';
import { formatThresholdValue } from '~/app/utilities/evaluationUtils';
import type { CollectionBenchmark, FlatBenchmark, Provider } from '~/app/types';
import './CollectionBenchmarkReviewList.scss';

type CollectionBenchmarkReviewListProps = {
  benchmarks: CollectionBenchmark[];
  providers: Provider[];
  testIdPrefix: 'copy-suite-review' | 'goal-suite-review';
  includeParameters: boolean;
};

type BenchmarkReviewCardProps = {
  benchmark: CollectionBenchmark;
  catalogBenchmark?: FlatBenchmark;
  providerName?: string;
  testIdPrefix: 'copy-suite-review' | 'goal-suite-review';
  includeParameters: boolean;
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

const BenchmarkReviewCard: React.FC<BenchmarkReviewCardProps> = ({
  benchmark,
  catalogBenchmark,
  providerName,
  testIdPrefix,
  includeParameters,
}) => {
  const parameters = Object.entries(benchmark.parameters ?? {});
  const hasDetails =
    Boolean(benchmark.primary_score?.metric) ||
    Boolean(benchmark.pass_criteria) ||
    (includeParameters && parameters.length > 0);

  return (
    <Card isCompact className="evalhub-collection-benchmark-review__card">
      <CardTitle>
        {catalogBenchmark?.name ?? benchmark.id}
        <Content
          component="p"
          className="pf-v6-u-mb-0 pf-v6-u-font-family-text pf-v6-u-font-weight-normal"
        >
          {benchmark.id}
          {providerName ? ` · ${providerName}` : ''}
        </Content>
      </CardTitle>
      {hasDetails ? (
        <CardBody data-testid={`${testIdPrefix}-benchmark-details`}>
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
            {includeParameters
              ? parameters.map(([key, value]) => (
                  <DescriptionListGroup key={key}>
                    <DescriptionListTerm>{getBenchmarkParameterLabel(key)}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatParameterValue(value)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ))
              : null}
          </DescriptionList>
        </CardBody>
      ) : null}
    </Card>
  );
};

const CollectionBenchmarkReviewList: React.FC<CollectionBenchmarkReviewListProps> = ({
  benchmarks,
  providers,
  testIdPrefix,
  includeParameters,
}) => {
  const benchmarksByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);
  const renderCard = (benchmark: CollectionBenchmark) => {
    const benchmarkKey = `${benchmark.provider_id ?? ''}:${benchmark.id}`;
    const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
    return (
      <BenchmarkReviewCard
        key={benchmarkKey}
        benchmark={benchmark}
        catalogBenchmark={benchmarksByKey.get(benchmarkKey)}
        providerName={provider?.title || provider?.name || benchmark.provider_id}
        testIdPrefix={testIdPrefix}
        includeParameters={includeParameters}
      />
    );
  };

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-md">
        Benchmarks
      </Title>
      {benchmarks.length === 0 ? (
        <Content component="p">No benchmarks are selected.</Content>
      ) : (
        <Gallery
          hasGutter
          minWidths={{ default: '100%', md: '250px' }}
          data-testid={`${testIdPrefix}-benchmarks`}
          className="evalhub-collection-benchmark-review__grid"
        >
          {benchmarks.map((benchmark) => (
            <GalleryItem key={`${benchmark.provider_id ?? ''}:${benchmark.id}`}>
              {renderCard(benchmark)}
            </GalleryItem>
          ))}
        </Gallery>
      )}
    </>
  );
};

export default CollectionBenchmarkReviewList;
/* eslint-enable camelcase */
