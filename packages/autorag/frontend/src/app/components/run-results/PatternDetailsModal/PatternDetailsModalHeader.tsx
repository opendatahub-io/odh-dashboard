import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import type { MenuToggleElement } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { formatMetricName, formatMetricValue, formatPatternName } from '~/app/utilities/utils';

type PatternDetailsModalHeaderProps = {
  patterns: AutoragPattern[];
  selectedIndex: number;
  rank: number;
  optimizedMetric?: string;
  onPatternChange: (index: number) => void;
  onDownload: () => void;
  onSaveNotebook?: (patternName: string, notebookType: 'indexing' | 'inference') => void;
  comparisonEnabled?: boolean;
  comparisonPatternIndex?: number | null;
};

const PatternDetailsModalHeader: React.FC<PatternDetailsModalHeaderProps> = ({
  patterns,
  selectedIndex,
  rank,
  optimizedMetric,
  onPatternChange,
  onDownload,
  onSaveNotebook,
  comparisonEnabled,
  comparisonPatternIndex,
}) => {
  const [isPatternDropdownOpen, setIsPatternDropdownOpen] = React.useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = React.useState(false);

  const data = patterns[selectedIndex];

  return (
    <>
      <Flex
        alignItems={{ default: 'alignItemsFlexEnd' }}
        gap={{ default: 'gapXl' }}
        data-testid="pattern-details-header"
      >
        <FlexItem>
          <Stack>
            <StackItem>
              <Content component={ContentVariants.small}>Pattern details</Content>
            </StackItem>
            <StackItem>
              {patterns.length > 1 ? (
                <Dropdown
                  isOpen={isPatternDropdownOpen}
                  onSelect={(_e, value) => {
                    onPatternChange(Number(value));
                    setIsPatternDropdownOpen(false);
                  }}
                  onOpenChange={setIsPatternDropdownOpen}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsPatternDropdownOpen(!isPatternDropdownOpen)}
                      isExpanded={isPatternDropdownOpen}
                      data-testid="pattern-selector-dropdown"
                    >
                      {formatPatternName(data.name)}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    {patterns.map((pattern, i) => (
                      <DropdownItem
                        key={i}
                        value={i}
                        isDisabled={comparisonEnabled && i === comparisonPatternIndex}
                        data-testid={`pattern-option-${pattern.name}`}
                      >
                        {formatPatternName(pattern.name)}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              ) : (
                <Title headingLevel="h2" size="lg">
                  {formatPatternName(data.name)}
                </Title>
              )}
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <Content component={ContentVariants.small}>Rank</Content>
            </StackItem>
            <StackItem>
              <Title headingLevel="h2" size="lg" data-testid="pattern-rank">
                {rank}
              </Title>
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <Content component={ContentVariants.small}>
                {optimizedMetric
                  ? `${formatMetricName(optimizedMetric)} (optimized)`
                  : 'Final score'}
              </Content>
            </StackItem>
            <StackItem>
              <Title headingLevel="h2" size="lg" data-testid="pattern-final-score">
                {optimizedMetric && data.scores[optimizedMetric]
                  ? formatMetricValue(data.scores[optimizedMetric].mean)
                  : data.final_score.toFixed(3)}
              </Title>
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem align={{ default: 'alignRight' }}>
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Button
                variant="secondary"
                icon={<DownloadIcon />}
                onClick={onDownload}
                data-testid="pattern-details-download"
              >
                Download
              </Button>
            </FlexItem>
            {onSaveNotebook && (
              <FlexItem>
                <Dropdown
                  isOpen={isActionsDropdownOpen}
                  onSelect={(_e, value) => {
                    setIsActionsDropdownOpen(false);
                    if (value === 'indexing' || value === 'inference') {
                      onSaveNotebook(data.name, value);
                    }
                  }}
                  onOpenChange={setIsActionsDropdownOpen}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      variant="primary"
                      onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                      isExpanded={isActionsDropdownOpen}
                      data-testid="pattern-details-save-notebook-toggle"
                    >
                      {comparisonEnabled
                        ? `${formatPatternName(data.name)} actions`
                        : 'Save as notebook'}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      key="indexing"
                      value="indexing"
                      data-testid="pattern-details-save-indexing-notebook"
                    >
                      {comparisonEnabled ? 'Save as indexing notebook' : 'Indexing'}
                    </DropdownItem>
                    <DropdownItem
                      key="inference"
                      value="inference"
                      data-testid="pattern-details-save-inference-notebook"
                    >
                      {comparisonEnabled ? 'Save as inference notebook' : 'Inference'}
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </FlexItem>
            )}
          </Flex>
        </FlexItem>
      </Flex>
      <Divider className="pf-v6-u-mt-md" />
    </>
  );
};

export default PatternDetailsModalHeader;
