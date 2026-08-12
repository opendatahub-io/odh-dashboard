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
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { FlatBenchmark } from '~/app/types';
import BenchmarkDrawerTileContent from './BenchmarkDrawerTileContent';
import { capitalizeFirst, getCategoryColor } from './benchmarkUtils';

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
    // DrawerPanelContent must remain in the DOM for PF's slide-in/out CSS transition to work
    return <DrawerPanelContent isResizable minSize="400px" />;
  }

  const color = getCategoryColor(benchmark.category);

  const drawerHeadStyle: React.CSSProperties = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- PF drawer CSS vars are not in CSSProperties
    ...({
      '--pf-v6-c-drawer__head--PaddingBlockEnd': 'var(--pf-t--global--spacer--xs)',
    } as React.CSSProperties),
  };

  const drawerScrollBodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
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
                  }}
                >
                  {benchmark.providerName
                    ? `${benchmark.id} · ${benchmark.providerName}`
                    : benchmark.id}
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
        <BenchmarkDrawerTileContent
          name={benchmark.name}
          id={benchmark.id}
          description={benchmark.description}
          metrics={benchmark.metrics}
          providerName={benchmark.providerName}
          providerAgent={benchmark.providerAgent}
          primaryScore={benchmark.primary_score}
          passCriteria={benchmark.pass_criteria}
          url={benchmark.url}
          trackingSurface="benchmark_drawer"
          showHeader={false}
        />
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }} className="pf-v6-u-mt-md">
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          <FlexItem>
            <Button
              variant="primary"
              data-testid="select-benchmark-button"
              onClick={() => onRunBenchmark(benchmark)}
            >
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
