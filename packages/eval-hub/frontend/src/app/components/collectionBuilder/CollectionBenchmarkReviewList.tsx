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
  List,
  ListItem,
  Title,
} from '@patternfly/react-core';
import { getMetricDisplayName } from '~/app/components/benchmarkUtils';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';
import { formatThresholdValue } from '~/app/utilities/evaluationUtils';
import type { CollectionBenchmark, Provider } from '~/app/types';

type CollectionBenchmarkReviewListProps = {
  benchmarks: CollectionBenchmark[];
  providers: Provider[];
  formatParameterLabel: (key: string) => string;
  testIdPrefix: 'copy-suite-review' | 'goal-suite-review';
  providerClassName: string;
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

const CollectionBenchmarkReviewList: React.FC<CollectionBenchmarkReviewListProps> = ({
  benchmarks,
  providers,
  formatParameterLabel,
  testIdPrefix,
  providerClassName,
}) => {
  const benchmarksByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-md pf-v6-u-mt-lg">
        Benchmarks ({benchmarks.length})
      </Title>
      {benchmarks.length === 0 ? (
        <Content component="p">No benchmarks are selected.</Content>
      ) : (
        <List isPlain data-testid={`${testIdPrefix}-benchmarks`}>
          {benchmarks.map((benchmark) => {
            const benchmarkKey = `${benchmark.provider_id ?? ''}:${benchmark.id}`;
            const catalogBenchmark = benchmarksByKey.get(benchmarkKey);
            const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
            const providerName = provider?.title || provider?.name || benchmark.provider_id;
            const parameters = Object.entries(benchmark.parameters ?? {});
            const hasDetails =
              Boolean(benchmark.primary_score?.metric) ||
              Boolean(benchmark.pass_criteria) ||
              parameters.length > 0;

            return (
              <ListItem key={benchmarkKey} className="pf-v6-u-mb-md">
                <Card isCompact>
                  <CardTitle>
                    {catalogBenchmark?.name ?? benchmark.id}
                    <Content
                      component="p"
                      className={`${providerClassName} pf-v6-u-font-family-text pf-v6-u-font-weight-normal`}
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
    </>
  );
};

export default CollectionBenchmarkReviewList;
/* eslint-enable camelcase */
