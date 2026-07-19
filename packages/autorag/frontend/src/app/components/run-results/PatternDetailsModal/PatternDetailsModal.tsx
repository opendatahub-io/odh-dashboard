import React from 'react';
import ReactDOM from 'react-dom';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Popover,
  Switch,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import classNames from 'classnames';
import type { AutoragPattern, PatternDataBundle, TabDefinition } from '~/app/types/autoragPattern';
import { usePatternEvaluationResults } from '~/app/hooks/usePatternEvaluationResults';
import {
  computePatternRankMap,
  formatMetricName,
  formatMetricValue,
  formatPatternName,
} from '~/app/utilities/utils';
import { getVisibleTabs, OVERVIEW_KEY, SAMPLE_QA_KEY } from './tabConfig';
import PatternDetailsModalHeader from './PatternDetailsModalHeader';
import PatternComparisonSelectModal from './PatternComparisonSelectModal';
import PatternInformationTab, { buildTopLevelFields } from './tabs/PatternInformationTab';
import { settingsSectionEntries } from './tabs/KeyValueTab';
import KeyValueList from './components/KeyValueList';
import ComparisonKeyValueList from './components/ComparisonKeyValueList';
import ConfidenceIntervalChart from './components/ConfidenceIntervalChart';
import './PatternDetailsModal.scss';

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
  onTryPattern?: (patternName: string) => void;
  onViewCode?: (patternName: string) => void;
};

/** Group tabs by their section for sidebar rendering. */
function groupTabsBySection(tabs: TabDefinition[]): Map<string, TabDefinition[]> {
  const groups = new Map<string, TabDefinition[]>();
  for (const tab of tabs) {
    const existing = groups.get(tab.section) ?? [];
    existing.push(tab);
    groups.set(tab.section, existing);
  }
  return groups;
}

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
  onTryPattern,
  onViewCode,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string>(OVERVIEW_KEY);
  const [isPrinting, setIsPrinting] = React.useState(false);

  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false);
  const [comparisonPatternIndex, setComparisonPatternIndex] = React.useState<number | null>(null);
  const [isComparisonSelectOpen, setIsComparisonSelectOpen] = React.useState(false);

  const data = patterns[selectedIndex];

  const rankMap = React.useMemo(() => computePatternRankMap(patterns), [patterns]);

  // Primary pattern evaluation results
  const { data: primaryEvaluationResults, isLoading: primaryEvaluationLoading } =
    usePatternEvaluationResults(namespace, ragPatternsBasePath, data.name, isOpen);

  // Comparison pattern evaluation results
  const comparisonPatternData =
    comparisonEnabled && comparisonPatternIndex !== null ? patterns[comparisonPatternIndex] : null;

  const { data: comparisonEvaluationResults, isLoading: comparisonEvaluationLoading } =
    usePatternEvaluationResults(
      namespace,
      ragPatternsBasePath,
      comparisonPatternData?.name ?? '',
      isOpen && !!comparisonPatternData,
    );

  // Reset state when modal opens
  const prevIsOpen = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setActiveTabKey(OVERVIEW_KEY);
      setComparisonEnabled(false);
      setComparisonPatternIndex(null);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  // Print handling
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

  // Build tab list
  const showSampleQA =
    primaryEvaluationLoading || (primaryEvaluationResults && primaryEvaluationResults.length > 0);
  const settingsKeys = React.useMemo(() => new Set(Object.keys(data.settings)), [data.settings]);
  const visibleTabs = React.useMemo(
    () => getVisibleTabs(settingsKeys, !!showSampleQA),
    [settingsKeys, showSampleQA],
  );
  const groupedTabs = React.useMemo(() => groupTabsBySection(visibleTabs), [visibleTabs]);

  React.useEffect(() => {
    if (!visibleTabs.some((t) => t.key === activeTabKey)) {
      setActiveTabKey(OVERVIEW_KEY);
    }
  }, [visibleTabs, activeTabKey]);

  const activeTab =
    visibleTabs.find((t) => t.key === activeTabKey) ??
    visibleTabs.find((t) => t.key === OVERVIEW_KEY);
  const ActiveComponent = activeTab?.component;

  // Build pattern data bundles for tab components
  const primaryBundle: PatternDataBundle = React.useMemo(
    () => ({
      pattern: data,
      rank,
      evaluationResults: primaryEvaluationResults || undefined,
      isEvaluationLoading: primaryEvaluationLoading,
    }),
    [data, rank, primaryEvaluationResults, primaryEvaluationLoading],
  );

  const comparisonBundle: PatternDataBundle | null = React.useMemo(() => {
    if (!comparisonEnabled || !comparisonPatternData) {
      return null;
    }
    return {
      pattern: comparisonPatternData,
      rank: rankMap[comparisonPatternData.name] ?? 0,
      evaluationResults: comparisonEvaluationResults || undefined,
      isEvaluationLoading: comparisonEvaluationLoading,
    };
  }, [
    comparisonEnabled,
    comparisonPatternData,
    rankMap,
    comparisonEvaluationResults,
    comparisonEvaluationLoading,
  ]);

  const handleToggleComparison = React.useCallback(() => {
    if (comparisonEnabled) {
      setComparisonEnabled(false);
      setComparisonPatternIndex(null);
    } else {
      setIsComparisonSelectOpen(true);
    }
  }, [comparisonEnabled]);

  return (
    <>
      <Modal
        variant={ModalVariant.large}
        isOpen={isOpen}
        onClose={onClose}
        className="autorag-pattern-details-modal"
        data-testid="pattern-details-modal"
      >
        <ModalHeader title="Pattern Details" />
        <ModalBody>
          <PatternDetailsModalHeader
            patterns={patterns}
            selectedIndex={selectedIndex}
            rank={rank}
            optimizedMetric={optimizedMetric}
            onPatternChange={onPatternChange}
            onDownload={() => setIsPrinting(true)}
            onSaveNotebook={onSaveNotebook}
            onTryPattern={
              onTryPattern
                ? (patternName) => {
                    onClose();
                    onTryPattern(patternName);
                  }
                : undefined
            }
            onViewCode={
              onViewCode
                ? (patternName) => {
                    onClose();
                    onViewCode(patternName);
                  }
                : undefined
            }
            comparisonEnabled={comparisonEnabled}
            comparisonPatternIndex={comparisonPatternIndex}
          />
          <Flex
            alignItems={{ default: 'alignItemsStretch' }}
            className="autorag-pattern-details-grid"
            data-testid="pattern-details-nav"
          >
            <FlexItem
              className="autorag-pattern-details-sidebar"
              role="tablist"
              aria-orientation="vertical"
              aria-label="Pattern detail sections"
            >
              {[...groupedTabs.entries()].map(([section, tabs]) => (
                <div key={section}>
                  <div className="autorag-pattern-details-sidebar-section">{section}</div>
                  <ul className="autorag-pattern-details-nav-list">
                    {tabs.map((tab) => (
                      <li key={tab.key} role="presentation">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeTabKey === tab.key}
                          aria-controls="pattern-details-tabpanel"
                          className={classNames('autorag-pattern-details-nav-item', {
                            'm-active': activeTabKey === tab.key,
                          })}
                          onClick={() => setActiveTabKey(tab.key)}
                          data-testid={`tab-${tab.key}`}
                        >
                          {tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </FlexItem>
            <FlexItem
              flex={{ default: 'flex_1' }}
              className="autorag-pattern-details-content-wrapper"
              data-testid="pattern-details-content"
              role="tabpanel"
              id="pattern-details-tabpanel"
              aria-label={activeTab?.label}
            >
              <div className="autorag-pattern-details-content">
                {activeTab && ActiveComponent && (
                  <>
                    <Flex
                      justifyContent={{ default: 'justifyContentSpaceBetween' }}
                      alignItems={{ default: 'alignItemsCenter' }}
                    >
                      <FlexItem>
                        <div className="autorag-pattern-details-tab-title">
                          <Title headingLevel="h2" data-testid="pattern-details-tab-title">
                            {activeTab.label}
                          </Title>
                          <Popover bodyContent={activeTab.tooltip} position="top">
                            <Button
                              variant="plain"
                              aria-label={`${activeTab.label} info`}
                              data-testid="pattern-details-tab-info"
                              icon={<OutlinedQuestionCircleIcon />}
                            />
                          </Popover>
                        </div>
                      </FlexItem>
                      <FlexItem>
                        <Switch
                          id="compare-patterns-toggle"
                          label="Compare patterns"
                          isChecked={comparisonEnabled}
                          onChange={handleToggleComparison}
                          data-testid="compare-patterns-toggle"
                        />
                      </FlexItem>
                    </Flex>
                    {activeTab.description && (
                      <Content
                        component={ContentVariants.p}
                        className="autorag-pattern-details-tab-description"
                      >
                        {activeTab.description}
                      </Content>
                    )}
                    <div className="autorag-pattern-details-tab-content">
                      <ActiveComponent
                        primaryPattern={primaryBundle}
                        comparisonPattern={comparisonBundle}
                        optimizedMetric={optimizedMetric}
                        onChangeComparisonPattern={() => setIsComparisonSelectOpen(true)}
                      />
                    </div>
                  </>
                )}
              </div>
            </FlexItem>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={onClose} data-testid="pattern-details-close">
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <PatternComparisonSelectModal
        isOpen={isComparisonSelectOpen}
        onClose={() => {
          setIsComparisonSelectOpen(false);
        }}
        patterns={patterns}
        rankMap={rankMap}
        currentPatternIndex={comparisonPatternIndex ?? -1}
        excludePatternIndex={selectedIndex}
        optimizedMetric={optimizedMetric ?? ''}
        onSelectPattern={(index) => {
          setComparisonPatternIndex(index);
          setComparisonEnabled(true);
        }}
      />

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
              {comparisonBundle ? (
                <PatternInformationTab
                  primaryPattern={primaryBundle}
                  comparisonPattern={comparisonBundle}
                  optimizedMetric={optimizedMetric}
                />
              ) : (
                <>
                  <KeyValueList entries={buildTopLevelFields(data)} />
                  <ConfidenceIntervalChart scores={data.scores} />
                </>
              )}
            </div>
            {visibleTabs
              .filter((tab) => tab.key !== OVERVIEW_KEY && tab.key !== SAMPLE_QA_KEY)
              .map((tab) => {
                const primaryEntries = settingsSectionEntries(data.settings, tab.key);
                const comparisonEntries = comparisonBundle
                  ? settingsSectionEntries(comparisonBundle.pattern.settings, tab.key)
                  : undefined;
                return (
                  <div key={tab.key} className="autorag-print-page">
                    <div className="autorag-print-header">
                      <h1>{formatPatternName(data.name)}</h1>
                    </div>
                    <Title headingLevel="h2">{tab.label}</Title>
                    {comparisonBundle && comparisonEntries ? (
                      <ComparisonKeyValueList
                        primaryPattern={primaryBundle}
                        comparisonPattern={comparisonBundle}
                        primaryEntries={primaryEntries}
                        comparisonEntries={comparisonEntries}
                      />
                    ) : (
                      <KeyValueList entries={primaryEntries} />
                    )}
                  </div>
                );
              })}
            {primaryEvaluationResults && primaryEvaluationResults.length > 0 && (
              <div className="autorag-print-page">
                <div className="autorag-print-header">
                  <h1>{formatPatternName(data.name)}</h1>
                </div>
                <Title headingLevel="h2">Sample Q&A</Title>
                {primaryEvaluationResults.map((result, index) => (
                  <div key={`print-qa-${result.question_id || index}`} className="pf-v6-u-mb-md">
                    <strong>Question:</strong> {result.question}
                    <br />
                    <strong>Answer:</strong> {result.answer}
                    {result.correct_answers.map((answer, i) => (
                      <div key={`print-answer-${index}-${i}`}>
                        <strong>Expected answer {i + 1}:</strong> {answer}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default PatternDetailsModal;
