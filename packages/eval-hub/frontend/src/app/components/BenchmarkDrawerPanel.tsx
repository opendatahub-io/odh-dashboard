import * as React from 'react';
import {
  Button,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { FlatBenchmark } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { capitalizeFirst, getCategoryColor, toSafeExternalUrl } from './benchmarkUtils';

type BenchmarkDrawerPanelProps = {
  benchmark: FlatBenchmark | undefined;
  onClose: () => void;
  onRunBenchmark: (b: FlatBenchmark) => void;
};

const BenchmarkDrawerPanel: React.FC<BenchmarkDrawerPanelProps> = ({
  benchmark,
  onClose,
  onRunBenchmark,
}) => {
  if (!benchmark) {
    return null;
  }

  const color = getCategoryColor(benchmark.category);
  const safeBenchmarkUrl = toSafeExternalUrl(benchmark.url);

  return (
    <DrawerPanelContent isResizable minSize="400px" data-testid="benchmark-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          {benchmark.category && (
            <StackItem>
              <Label color={color}>{capitalizeFirst(benchmark.category)}</Label>
            </StackItem>
          )}
          <StackItem>
            <Title headingLevel="h2">{benchmark.name}</Title>
          </StackItem>
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody style={{ flex: 1, overflowY: 'auto' }}>
        <Stack hasGutter>
          <StackItem>
            <Content
              component="p"
              style={{
                marginTop: 'var(--pf-t--global--spacer--xs)',
                color: 'var(--pf-t--global--text--color--subtle)',
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
                      surface: 'benchmark_drawer',
                    })
                  }
                >
                  {benchmark.id}
                </Button>
              ) : (
                benchmark.id
              )}
            </Content>
          </StackItem>
          {benchmark.description && (
            <StackItem>
              <Content component="p">{benchmark.description}</Content>
            </StackItem>
          )}

          {benchmark.metrics && benchmark.metrics.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Content
                    component="p"
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Metrics evaluated
                  </Content>
                </StackItem>
                <StackItem>
                  <LabelGroup numLabels={benchmark.metrics.length} isCompact>
                    {benchmark.metrics.map((metric) => (
                      <Label key={metric} isCompact variant="outline">
                        {metric}
                      </Label>
                    ))}
                  </LabelGroup>
                </StackItem>
              </Stack>
            </StackItem>
          )}

          {benchmark.primary_score && (
            <StackItem>
              <Content
                component="p"
                style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
              >
                Primary scorer metric
              </Content>
              <Content component="p">{benchmark.primary_score.metric}</Content>
            </StackItem>
          )}

          {benchmark.pass_criteria && (
            <StackItem>
              <Content
                component="p"
                style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
              >
                Benchmark threshold
              </Content>
              <Content component="p">{benchmark.pass_criteria.threshold}</Content>
            </StackItem>
          )}

          {benchmark.providerName && (
            <StackItem>
              <Content
                component="p"
                style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
              >
                Evaluation framework
              </Content>
              <Content component="p">{benchmark.providerName}</Content>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }}>
        <Button variant="primary" onClick={() => onRunBenchmark(benchmark)}>
          Use this benchmark
        </Button>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default BenchmarkDrawerPanel;
