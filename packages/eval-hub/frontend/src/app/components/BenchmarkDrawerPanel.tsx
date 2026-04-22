import * as React from 'react';
import {
  Button,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
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

  const drawerHeadStyle: React.CSSProperties = {
    // Tighten space before the scrollable body (PF default is --pf-t--global--spacer--sm)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- PF drawer CSS vars are not in CSSProperties
    ...({
      '--pf-v6-c-drawer__head--PaddingBlockEnd': 'var(--pf-t--global--spacer--xs)',
    } as React.CSSProperties),
  };

  const drawerScrollBodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    // Default panel body block-start padding is md; pull description up under the id line
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- PF drawer CSS vars are not in CSSProperties
    ...({
      '--pf-v6-c-drawer__panel__body--PaddingBlockStart': 'var(--pf-t--global--spacer--xs)',
    } as React.CSSProperties),
  };

  return (
    <DrawerPanelContent isResizable minSize="400px" data-testid="benchmark-drawer-panel">
      <DrawerHead style={drawerHeadStyle}>
        <Stack hasGutter>
          {benchmark.category && (
            <StackItem>
              <Label color={color}>{capitalizeFirst(benchmark.category)}</Label>
            </StackItem>
          )}
          <StackItem>
            <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
              <FlexItem>
                <Title headingLevel="h2">{benchmark.name}</Title>
              </FlexItem>
              <FlexItem>
                <Content
                  component="p"
                  style={{
                    marginBlock: 0,
                    color: 'var(--pf-t--global--text--color--subtle)',
                    fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
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
                      style={{ fontWeight: 'var(--pf-t--global--font--weight--heading--default)' }}
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
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody style={drawerScrollBodyStyle}>
        <Stack hasGutter>
          {benchmark.description && (
            <StackItem>
              <Content component="p" style={{ marginBlockStart: 0 }}>
                {benchmark.description}
              </Content>
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

      <DrawerPanelBody style={{ flex: '0 0 auto' }} className="pf-v6-u-mt-md">
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          <FlexItem>
            <Button variant="primary" onClick={() => onRunBenchmark(benchmark)}>
              Select benchmark
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="link" onClick={onClose} data-testid="benchmark-drawer-close-footer">
              Close
            </Button>
          </FlexItem>
        </Flex>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default BenchmarkDrawerPanel;
