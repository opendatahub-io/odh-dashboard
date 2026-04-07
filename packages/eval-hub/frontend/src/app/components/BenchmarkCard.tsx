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
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { FlatBenchmark } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { getCategoryColor, toSafeExternalUrl, VISIBLE_METRICS_COUNT } from './benchmarkUtils';

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
  const safeBenchmarkUrl = toSafeExternalUrl(benchmark.url);

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
          {safeBenchmarkUrl ? (
            <Button
              variant="link"
              isInline
              component="a"
              href={safeBenchmarkUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              onClick={() =>
                fireMiscTrackingEvent(EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED, {
                  url: safeBenchmarkUrl,
                  benchmarkId: benchmark.id,
                  surface: 'benchmark_card',
                })
              }
            >
              {benchmark.id}
            </Button>
          ) : (
            benchmark.id
          )}
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
          Use this benchmark
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkCard;
