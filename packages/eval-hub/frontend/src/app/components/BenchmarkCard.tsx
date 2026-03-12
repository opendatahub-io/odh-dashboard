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
      style={{ cursor: 'pointer' }}
      data-testid={`benchmark-card-${benchmark.providerId}-${benchmark.id}`}
      onClick={onSelect}
    >
      {benchmark.category && (
        <CardHeader>
          <Label color={color} isCompact>
            {benchmark.category}
          </Label>
        </CardHeader>
      )}
      <CardTitle>{benchmark.name}</CardTitle>

      <CardBody>
        {benchmark.description && <Content component="p">{benchmark.description}</Content>}
        {benchmark.metrics && benchmark.metrics.length > 0 && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div onClick={(e) => e.stopPropagation()}>
            <LabelGroup numLabels={VISIBLE_METRICS_COUNT} isCompact>
              {benchmark.metrics.map((metric) => (
                <Label key={metric} isCompact variant="outline">
                  {metric}
                </Label>
              ))}
            </LabelGroup>
          </div>
        )}
      </CardBody>

      <CardFooter>
        <Button
          variant="link"
          isInline
          onClick={(e) => {
            e.stopPropagation();
            onRunBenchmark();
          }}
        >
          Run benchmark
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkCard;
