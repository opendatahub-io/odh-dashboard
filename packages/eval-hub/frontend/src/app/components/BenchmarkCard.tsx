import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { FlatBenchmark } from '~/app/types';
import {
  formatCategory,
  getCategoryColor,
  getMetricDisplayName,
  VISIBLE_METRICS_COUNT,
} from './benchmarkUtils';
import './BenchmarkCard.scss';

type BenchmarkCardProps = {
  benchmark: FlatBenchmark;
  isSelected: boolean;
  onSelect: () => void;
  onRunBenchmark: () => void;
};

const BenchmarkCard: React.FC<BenchmarkCardProps> = ({
  benchmark,
  isSelected,
  onSelect,
  onRunBenchmark,
}) => {
  const color = getCategoryColor(benchmark.category);

  return (
    <Card
      isSelected={isSelected}
      data-testid={`benchmark-card-${benchmark.providerId}-${benchmark.id}`}
    >
      {benchmark.category && (
        <CardHeader>
          <Label color={color} isCompact>
            {formatCategory(benchmark.category)}
          </Label>
        </CardHeader>
      )}
      <CardTitle>
        <Button
          variant="link"
          isInline
          style={{
            textDecoration: 'none',
            fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
          }}
          onClick={onSelect}
        >
          {benchmark.name}
        </Button>
        <Content component="p" className="evalhub-benchmark-card__subtitle">
          {benchmark.id} · {benchmark.providerName}
        </Content>
      </CardTitle>

      <CardBody>
        {benchmark.description && (
          <Content
            component="p"
            style={{
              fontSize: 'var(--pf-t--global--font--size--sm)',
              color: 'var(--pf-t--global--text--color--subtle)',
            }}
          >
            {benchmark.description}
          </Content>
        )}
        {benchmark.metrics && benchmark.metrics.length > 0 && (
          <LabelGroup numLabels={VISIBLE_METRICS_COUNT} isCompact>
            {benchmark.metrics.map((metric) => (
              <Label key={metric} isCompact variant="outline">
                {getMetricDisplayName(metric)}
              </Label>
            ))}
          </LabelGroup>
        )}
      </CardBody>

      <CardFooter>
        <Button
          variant="secondary"
          isInline
          data-testid="select-benchmark-button"
          onClick={onRunBenchmark}
        >
          Select benchmark
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkCard;
