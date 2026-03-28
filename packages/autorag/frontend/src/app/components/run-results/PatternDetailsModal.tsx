import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  ExpandableSection,
  Flex,
  FlexItem,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Progress,
  ProgressMeasureLocation,
  Radio,
  Skeleton,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { Charts } from '@patternfly/react-charts/echarts';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TooltipComponent, RadarComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import {
  chart_color_blue_300 as chartColorBlue300,
  chart_color_blue_100 as chartColorBlue100,
} from '@patternfly/react-tokens';
import type {
  AutoRAGEvaluationResult,
  AutoRAGEvaluationScores,
  AutoragPattern,
  AutoragPatternScoreMetric,
  AutoragPatternSettings,
} from '~/app/types/autoragPattern';
import { usePatternEvaluationResults } from '~/app/hooks/usePatternEvaluationResults';
import './PatternDetailsModal.scss';

let echartsRegistered = false;

const getCSSVar = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export type PatternDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patterns: AutoragPattern[];
  selectedIndex: number;
  rank: number;
  onPatternChange: (index: number) => void;
  namespace?: string;
  ragPatternsBasePath?: string;
};

const OVERVIEW_KEY = 'pattern_information';
const SAMPLE_QA_KEY = 'sample_qa';

const humanize = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const KeyValueList: React.FC<{ entries: Record<string, unknown> }> = ({ entries }) => (
  <DescriptionList isHorizontal>
    {Object.entries(entries).map(([key, value]) => (
      <DescriptionListGroup key={key}>
        <DescriptionListTerm>{humanize(key)}</DescriptionListTerm>
        <DescriptionListDescription>{String(value)}</DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

type ScoreType = 'mean' | 'ci_high' | 'ci_low';

/* eslint-disable camelcase */
const scoreTypeLabels: Record<ScoreType, string> = {
  mean: 'Mean',
  ci_high: 'CI High',
  ci_low: 'CI Low',
};
/* eslint-enable camelcase */

const ScoresList: React.FC<{
  scores: Record<string, AutoragPatternScoreMetric | undefined>;
  scoreType: ScoreType;
}> = ({ scores, scoreType }) => (
  <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
    {Object.entries(scores).map(([key, score]) => {
      if (!score) {
        return null;
      }
      const value = score[scoreType];
      return (
        <DescriptionListGroup key={key}>
          <DescriptionListTerm>
            {humanize(key)} ({scoreTypeLabels[scoreType]})
          </DescriptionListTerm>
          <DescriptionListDescription>
            <Progress
              value={value * 100}
              title=""
              label={`${value.toFixed(3)}`}
              measureLocation={ProgressMeasureLocation.outside}
              data-testid={`score-progress-${key}`}
            />
          </DescriptionListDescription>
        </DescriptionListGroup>
      );
    })}
  </DescriptionList>
);

const settingsSectionEntries = (
  settings: AutoragPatternSettings,
  section: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, unknown> => {
  const record: Record<string, Record<string, unknown>> = Object.fromEntries(
    Object.entries(settings).map(([key, val]) => [key, val]),
  );
  return record[section] ?? {};
};

const scoreIndicators: { key: keyof AutoRAGEvaluationScores; label: string }[] = [
  { key: 'answer_correctness', label: 'Answer correctness' },
  { key: 'faithfulness', label: 'Faithfulness' },
  { key: 'context_correctness', label: 'Context correctness' },
];

const ScoreRadarChart: React.FC<{ scores: AutoRAGEvaluationScores }> = ({ scores }) => {
  if (!echartsRegistered) {
    echarts.use([RadarChart, RadarComponent, SVGRenderer, TooltipComponent]);
    echartsRegistered = true;
  }

  const labelColor = getCSSVar('--pf-t--global--text--color--regular', '#151515');
  const splitLineColor = getCSSVar('--pf-t--global--border--color--default', '#d2d2d2');
  const seriesColor = chartColorBlue300.var;

  const option = React.useMemo(
    () => ({
      radar: {
        indicator: scoreIndicators.map(({ label }) => ({ name: label, max: 1 })),
        radius: 70,
        center: ['45%', '55%'],
        axisName: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: splitLineColor } },
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              name: 'Scores',
              value: scoreIndicators.map(({ key }) => scores[key]),
            },
          ],
          lineStyle: { color: seriesColor },
          itemStyle: { color: seriesColor },
          areaStyle: { color: chartColorBlue100.var, opacity: 0.3 },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
      tooltip: {
        trigger: 'item' as const,
      },
    }),
    [scores, labelColor, splitLineColor, seriesColor],
  );

  return <Charts themeColor="blue" nodeSelector="html" height={280} width={420} option={option} />;
};

const SampleQAEntry: React.FC<{ result: AutoRAGEvaluationResult }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card isCompact data-testid={`qa-entry-${result.question_id}`}>
      <CardBody>
        <Flex>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Content component={ContentVariants.small}>
              <strong>Question</strong>
            </Content>
            <Content component={ContentVariants.p} className="autorag-pre-wrap">
              {result.question}
            </Content>
            <ScoreRadarChart scores={result.scores} />
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Content component={ContentVariants.small}>
              <strong>Answer</strong>
            </Content>
            <Content component={ContentVariants.p} className="autorag-pre-wrap">
              {result.answer}
            </Content>
            <ExpandableSection
              toggleText={`View expected answer (${result.correct_answers.length})`}
              isExpanded={isExpanded}
              onToggle={(_e, expanded) => setIsExpanded(expanded)}
              isIndented
              data-testid={`qa-expected-answers-${result.question_id}`}
            >
              <Stack hasGutter>
                {result.correct_answers.map((answer, i) => (
                  <StackItem key={`answer-${result.question_id}-${i}`}>
                    <Content component={ContentVariants.small}>
                      <strong>Expected answer {i + 1}</strong>
                    </Content>
                    <Content component={ContentVariants.p} className="autorag-pre-wrap">
                      {answer}
                    </Content>
                  </StackItem>
                ))}
              </Stack>
            </ExpandableSection>
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};

const SampleQAContent: React.FC<{ results: AutoRAGEvaluationResult[] }> = ({ results }) => (
  <Stack hasGutter>
    {results.map((result) => (
      <StackItem key={result.question_id}>
        <SampleQAEntry result={result} />
      </StackItem>
    ))}
  </Stack>
);

const PrintSampleQAContent: React.FC<{ results: AutoRAGEvaluationResult[] }> = ({ results }) => (
  <Stack hasGutter>
    {results.map((result) => (
      <StackItem key={result.question_id}>
        <Card isCompact>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <Content component={ContentVariants.small}>
                  <strong>Question</strong>
                </Content>
                <Content component={ContentVariants.p} className="autorag-pre-wrap">
                  {result.question}
                </Content>
              </StackItem>
              <StackItem>
                <Content component={ContentVariants.small}>
                  <strong>Answer</strong>
                </Content>
                <Content component={ContentVariants.p} className="autorag-pre-wrap">
                  {result.answer}
                </Content>
              </StackItem>
              {result.correct_answers.map((answer, i) => (
                <StackItem key={`print-answer-${result.question_id}-${i}`}>
                  <Content component={ContentVariants.small}>
                    <strong>Expected answer {i + 1}</strong>
                  </Content>
                  <Content component={ContentVariants.p} className="autorag-pre-wrap">
                    {answer}
                  </Content>
                </StackItem>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </StackItem>
    ))}
  </Stack>
);

const PatternDetailsModal: React.FC<PatternDetailsModalProps> = ({
  isOpen,
  onClose,
  patterns,
  selectedIndex,
  rank,
  onPatternChange,
  namespace,
  ragPatternsBasePath,
}) => {
  const [activeSection, setActiveSection] = React.useState<string>(OVERVIEW_KEY);
  const [scoreType, setScoreType] = React.useState<ScoreType>('mean');
  const [isPatternDropdownOpen, setIsPatternDropdownOpen] = React.useState(false);

  const data = patterns[selectedIndex];

  const { data: evaluationResults, isLoading: evaluationResultsLoading } =
    usePatternEvaluationResults(namespace, ragPatternsBasePath, data.name, isOpen);

  const [isPrinting, setIsPrinting] = React.useState(false);

  const prevIsOpen = React.useRef(isOpen);
  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setActiveSection(OVERVIEW_KEY);
      setScoreType('mean');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  React.useEffect(() => {
    if (!isPrinting) {
      return;
    }
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    const frameId = requestAnimationFrame(() => {
      window.print();
    });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrinting]);

  const settingsKeys = Object.keys(data.settings);
  const showSampleQA =
    evaluationResultsLoading || (evaluationResults && evaluationResults.length > 0);
  const allSections = [OVERVIEW_KEY, ...settingsKeys, ...(showSampleQA ? [SAMPLE_QA_KEY] : [])];

  const topLevelFields: Record<string, unknown> = {
    name: data.name,
    iteration: data.iteration,
    // eslint-disable-next-line camelcase
    max_combinations: data.max_combinations,
    // eslint-disable-next-line camelcase
    duration_seconds: data.duration_seconds,
    // eslint-disable-next-line camelcase
    final_score: data.final_score,
  };

  const renderContent = (): React.ReactNode => {
    if (activeSection === OVERVIEW_KEY) {
      return (
        <Stack hasGutter>
          <StackItem>
            <KeyValueList entries={topLevelFields} />
          </StackItem>
          <StackItem>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Score type</DescriptionListTerm>
                <DescriptionListDescription>
                  <Flex gap={{ default: 'gapLg' }}>
                    {(['mean', 'ci_high', 'ci_low'] satisfies ScoreType[]).map((type) => (
                      <FlexItem key={type}>
                        <Radio
                          id={`score-type-${type}`}
                          name="score-type"
                          label={scoreTypeLabels[type]}
                          isChecked={scoreType === type}
                          onChange={() => setScoreType(type)}
                          data-testid={`score-type-${type}`}
                        />
                      </FlexItem>
                    ))}
                  </Flex>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </StackItem>
          <StackItem>
            <ScoresList scores={data.scores} scoreType={scoreType} />
          </StackItem>
        </Stack>
      );
    }
    if (activeSection === SAMPLE_QA_KEY) {
      if (evaluationResultsLoading) {
        return <Skeleton screenreaderText="Loading evaluation results" />;
      }
      if (evaluationResults) {
        return <SampleQAContent results={evaluationResults} />;
      }
      return null;
    }
    return <KeyValueList entries={settingsSectionEntries(data.settings, activeSection)} />;
  };

  const getTabLabel = (key: string): string => {
    if (key === OVERVIEW_KEY) {
      return 'Pattern information';
    }
    if (key === SAMPLE_QA_KEY) {
      return 'Sample Q&A';
    }
    return humanize(key);
  };

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      className="autorag-pattern-details-modal"
      data-testid="pattern-details-modal"
    >
      <ModalHeader>
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
                        Pattern {selectedIndex}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {patterns.map((_pattern, i) => (
                        <DropdownItem key={i} value={i}>
                          Pattern {i}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                ) : (
                  <Title headingLevel="h2" size="lg">
                    Pattern {selectedIndex}
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
                <Content component={ContentVariants.small}>Final score</Content>
              </StackItem>
              <StackItem>
                <Title headingLevel="h2" size="lg" data-testid="pattern-final-score">
                  {data.final_score.toFixed(3)}
                </Title>
              </StackItem>
            </Stack>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <Button
              variant="secondary"
              icon={<DownloadIcon />}
              onClick={() => setIsPrinting(true)}
              data-testid="pattern-details-download"
            >
              Download
            </Button>
          </FlexItem>
        </Flex>
        <Divider />
      </ModalHeader>
      <ModalBody>
        <Flex className="autorag-pattern-details-screen-only">
          <FlexItem>
            <Tabs
              activeKey={activeSection}
              onSelect={(_e, key) => setActiveSection(String(key))}
              isVertical
              aria-label="Pattern detail sections"
            >
              {allSections.map((key) => (
                <Tab
                  key={key}
                  eventKey={key}
                  title={<TabTitleText>{getTabLabel(key)}</TabTitleText>}
                  data-testid={`tab-${key}`}
                />
              ))}
            </Tabs>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h3">{getTabLabel(activeSection)}</Title>
              </StackItem>
              <StackItem>{renderContent()}</StackItem>
            </Stack>
          </FlexItem>
        </Flex>
        {isPrinting && (
          <div className="autorag-pattern-details-print-only">
            <div className="autorag-print-header">
              <h1>{data.name}</h1>
              <p>
                Pattern {selectedIndex} | Final score: {data.final_score}
              </p>
            </div>
            <div className="autorag-print-page">
              <Title headingLevel="h2">Pattern information</Title>
              <KeyValueList entries={topLevelFields} />
              <Title headingLevel="h3">Scores ({scoreTypeLabels[scoreType]})</Title>
              <ScoresList scores={data.scores} scoreType={scoreType} />
            </div>
            {settingsKeys.map((key) => (
              <div key={key} className="autorag-print-page">
                <Title headingLevel="h2">{humanize(key)}</Title>
                <KeyValueList entries={settingsSectionEntries(data.settings, key)} />
              </div>
            ))}
            {evaluationResults && evaluationResults.length > 0 && (
              <div className="autorag-print-page">
                <Title headingLevel="h2">Sample Q&A</Title>
                <PrintSampleQAContent results={evaluationResults} />
              </div>
            )}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default PatternDetailsModal;
