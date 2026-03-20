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
import { getCategoryColor, VISIBLE_METRICS_COUNT } from './benchmarkUtils';

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
            {benchmark.category}
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
        <Content
          component="p"
          style={{
            color: 'var(--pf-t--global--text--color--subtle)',
            marginTop: 'var(--pf-t--global--spacer--xs)',
          }}
        >
          {benchmark.id}
        </Content>
      </CardTitle>

      <CardBody>
        {benchmark.description && <Content component="p">{benchmark.description}</Content>}
        {benchmark.metrics && benchmark.metrics.length > 0 && (
          <LabelGroup numLabels={VISIBLE_METRICS_COUNT} isCompact>
            {benchmark.metrics.map((metric) => (
              <Label key={metric} isCompact variant="outline">
                {metric}
              </Label>
            ))}
          </LabelGroup>
        )}
      </CardBody>

      <CardFooter>
        <Button variant="secondary" isInline onClick={onRunBenchmark}>
          Run this benchmark
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkCard;
