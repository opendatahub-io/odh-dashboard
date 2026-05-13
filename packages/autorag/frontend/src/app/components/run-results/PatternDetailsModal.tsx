import React from 'react';
import ReactDOM from 'react-dom';
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
import { formatMetricName, formatMetricValue, formatPatternName } from '~/app/utilities/utils';
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
  optimizedMetric?: string;
  onPatternChange: (index: number) => void;
  namespace?: string;
  ragPatternsBasePath?: string;
  onSaveNotebook?: (patternName: string, notebookType: 'indexing' | 'inference') => void;
};

const OVERVIEW_KEY = 'pattern_information';
const SAMPLE_QA_KEY = 'sample_qa';

const humanize = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

const flattenEntries = (obj: Record<string, unknown>, prefix = ''): [string, string][] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const label = prefix ? `${prefix} ${humanize(key)}` : humanize(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested: Record<string, unknown> = Object.fromEntries(Object.entries(value));
      return flattenEntries(nested, label);
    }
    return [[label, formatValue(value)]];
  });

const KeyValueList: React.FC<{ entries: Record<string, unknown> }> = ({ entries }) => (
  <DescriptionList isHorizontal>
    {flattenEntries(entries).map(([label, value]) => (
      <DescriptionListGroup key={label}>
        <DescriptionListTerm>{label}</DescriptionListTerm>
        <DescriptionListDescription>{value}</DescriptionListDescription>
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ci_high/ci_low can be null at runtime
      if (value === null) {
        return (
          <DescriptionListGroup key={key}>
            <DescriptionListTerm>
              {humanize(key)} ({scoreTypeLabels[scoreType]})
            </DescriptionListTerm>
            <DescriptionListDescription>N/A</DescriptionListDescription>
          </DescriptionListGroup>
        );
      }
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
        appendToBody: true,
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
    {results.map((result, index) => (
      <StackItem key={`qa-${result.question_id || index}`}>
        <SampleQAEntry result={result} />
      </StackItem>
    ))}
  </Stack>
);

const PrintSampleQAContent: React.FC<{ results: AutoRAGEvaluationResult[] }> = ({ results }) => (
  <Stack hasGutter>
    {results.map((result, index) => (
      <StackItem key={`print-qa-${result.question_id || index}`}>
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
                <StackItem key={`print-answer-${index}-${i}`}>
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
  optimizedMetric,
  onPatternChange,
  namespace,
  ragPatternsBasePath,
  onSaveNotebook,
}) => {
  const [activeSection, setActiveSection] = React.useState<string>(OVERVIEW_KEY);
  const [scoreType, setScoreType] = React.useState<ScoreType>('mean');
  const [isPatternDropdownOpen, setIsPatternDropdownOpen] = React.useState(false);
  const [isNotebookDropdownOpen, setIsNotebookDropdownOpen] = React.useState(false);

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
    window.print();
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrinting]);

  const settingsKeys = Object.keys(data.settings);
  const showSampleQA =
    evaluationResultsLoading || (evaluationResults && evaluationResults.length > 0);
  const allSections = [OVERVIEW_KEY, ...settingsKeys, ...(showSampleQA ? [SAMPLE_QA_KEY] : [])];

  const topLevelFields: Record<string, unknown> = {
    name: formatPatternName(data.name),
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
    <>
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
                          {formatPatternName(data.name)}
                        </MenuToggle>
                      )}
                    >
                      <DropdownList>
                        {patterns.map((pattern, i) => (
                          <DropdownItem key={i} value={i}>
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
                    onClick={() => setIsPrinting(true)}
                    data-testid="pattern-details-download"
                  >
                    Download
                  </Button>
                </FlexItem>
                {onSaveNotebook && (
                  <FlexItem>
                    <Dropdown
                      isOpen={isNotebookDropdownOpen}
                      onSelect={(_e, value) => {
                        setIsNotebookDropdownOpen(false);
                        if (value === 'indexing' || value === 'inference') {
                          onSaveNotebook(data.name, value);
                        }
                      }}
                      onOpenChange={setIsNotebookDropdownOpen}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          variant="primary"
                          onClick={() => setIsNotebookDropdownOpen(!isNotebookDropdownOpen)}
                          isExpanded={isNotebookDropdownOpen}
                          data-testid="pattern-details-save-notebook-toggle"
                        >
                          Save as notebook
                        </MenuToggle>
                      )}
                    >
                      <DropdownList>
                        <DropdownItem
                          key="indexing"
                          value="indexing"
                          data-testid="pattern-details-save-indexing-notebook"
                        >
                          Indexing
                        </DropdownItem>
                        <DropdownItem
                          key="inference"
                          value="inference"
                          data-testid="pattern-details-save-inference-notebook"
                        >
                          Inference
                        </DropdownItem>
                      </DropdownList>
                    </Dropdown>
                  </FlexItem>
                )}
              </Flex>
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
        </ModalBody>
      </Modal>

      {/* Print-only container: portalled to document.body so it sits outside
        the PF modal DOM — avoids backdrop/overflow/centering issues across
        browsers. Each section is rendered as a separate print page. */}
      {isPrinting &&
        ReactDOM.createPortal(
          <div className="odh-autox-print-only" data-testid="print-container">
            <div className="autorag-print-page autorag-print-page--first">
              <div className="autorag-print-header">
                <h1>{formatPatternName(data.name)}</h1>
                <p>
                  {formatPatternName(data.name)} |{' '}
                  {optimizedMetric
                    ? `${formatMetricName(optimizedMetric)} (optimized): ${
                        data.scores[optimizedMetric]
                          ? formatMetricValue(data.scores[optimizedMetric].mean)
                          : 'N/A'
                      }`
                    : `Final score: ${data.final_score}`}
                </p>
              </div>
              <Title headingLevel="h2">Pattern information</Title>
              <KeyValueList entries={topLevelFields} />
              <Title headingLevel="h3">Scores ({scoreTypeLabels[scoreType]})</Title>
              <ScoresList scores={data.scores} scoreType={scoreType} />
            </div>
            {settingsKeys.map((key) => (
              <div key={key} className="autorag-print-page">
                <div className="autorag-print-header">
                  <h1>{formatPatternName(data.name)}</h1>
                </div>
                <Title headingLevel="h2">{humanize(key)}</Title>
                <KeyValueList entries={settingsSectionEntries(data.settings, key)} />
              </div>
            ))}
            {evaluationResults && evaluationResults.length > 0 && (
              <div className="autorag-print-page">
                <div className="autorag-print-header">
                  <h1>{formatPatternName(data.name)}</h1>
                </div>
                <Title headingLevel="h2">Sample Q&A</Title>
                <PrintSampleQAContent results={evaluationResults} />
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default PatternDetailsModal;
