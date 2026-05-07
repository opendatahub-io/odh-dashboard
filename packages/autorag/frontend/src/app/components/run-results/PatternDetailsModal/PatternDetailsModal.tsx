import React from 'react';
import ReactDOM from 'react-dom';
import {
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Title,
} from '@patternfly/react-core';
import type { AutoragPattern, PatternDataBundle, ScoreType } from '~/app/types/autoragPattern';
import { usePatternEvaluationResults } from '~/app/hooks/usePatternEvaluationResults';
import {
  computePatternRankMap,
  formatMetricName,
  formatMetricValue,
  formatPatternName,
} from '~/app/utilities/utils';
import { getVisibleTabs, OVERVIEW_KEY } from './tabConfig';
import PatternDetailsModalHeader from './PatternDetailsModalHeader';
import PatternComparisonSelectModal from './PatternComparisonSelectModal';
import KeyValueList from './components/KeyValueList';
import ScoresList, { scoreTypeLabels } from './components/ScoresList';
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
};

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
  const [activeTabKey, setActiveTabKey] = React.useState<string>(OVERVIEW_KEY);
  const [scoreType, setScoreType] = React.useState<ScoreType>('mean');
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
  const prevIsOpen = React.useRef(isOpen);
  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setActiveTabKey(OVERVIEW_KEY);
      setScoreType('mean');
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
  const visibleTabs = React.useMemo(
    () => getVisibleTabs(data, !!showSampleQA),
    [data, showSampleQA],
  );

  const activeTab = visibleTabs.find((t) => t.key === activeTabKey);
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
    setComparisonEnabled((prev) => {
      const next = !prev;
      if (next && comparisonPatternIndex === null) {
        // Auto-open the selection modal when enabling comparison with no pattern selected
        setIsComparisonSelectOpen(true);
      }
      return next;
    });
  }, [comparisonPatternIndex]);

  // Settings keys for print view
  const settingsKeys = Object.keys(data.settings);

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
          <PatternDetailsModalHeader
            patterns={patterns}
            selectedIndex={selectedIndex}
            rank={rank}
            optimizedMetric={optimizedMetric}
            onPatternChange={onPatternChange}
            onDownload={() => setIsPrinting(true)}
            onSaveNotebook={onSaveNotebook}
            comparisonEnabled={comparisonEnabled}
            onToggleComparison={handleToggleComparison}
            comparisonPattern={comparisonBundle}
            onChangeComparisonPattern={() => setIsComparisonSelectOpen(true)}
          />
        </ModalHeader>
        <ModalBody>
          <Grid hasGutter className="autorag-pattern-details-screen-only">
            <GridItem span={2} className="autorag-pattern-details-sidebar">
              <nav aria-label="Pattern detail sections" data-testid="pattern-details-nav">
                <ul className="autorag-pattern-details-nav-list">
                  {visibleTabs.map((tab) => (
                    <li key={tab.key}>
                      <button
                        type="button"
                        className={`autorag-pattern-details-nav-item${
                          activeTabKey === tab.key
                            ? ' autorag-pattern-details-nav-item--active'
                            : ''
                        }`}
                        onClick={() => setActiveTabKey(tab.key)}
                        data-testid={`tab-${tab.key}`}
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </GridItem>
            <GridItem span={10} data-testid="pattern-details-content">
              {activeTab && ActiveComponent && (
                <>
                  <Title
                    headingLevel="h3"
                    className="pf-v6-u-mb-lg"
                    data-testid="pattern-details-tab-title"
                  >
                    {activeTab.label}
                  </Title>
                  <ActiveComponent
                    primaryPattern={primaryBundle}
                    comparisonPattern={comparisonBundle}
                    optimizedMetric={optimizedMetric}
                    scoreType={scoreType}
                    onScoreTypeChange={setScoreType}
                  />
                </>
              )}
            </GridItem>
          </Grid>
        </ModalBody>
      </Modal>

      <PatternComparisonSelectModal
        isOpen={isComparisonSelectOpen}
        onClose={() => {
          setIsComparisonSelectOpen(false);
          // If user cancels without selecting, disable comparison
          if (comparisonPatternIndex === null) {
            setComparisonEnabled(false);
          }
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
              <KeyValueList
                entries={{
                  name: formatPatternName(data.name),
                  iteration: data.iteration,
                  // eslint-disable-next-line camelcase
                  max_combinations: data.max_combinations,
                  // eslint-disable-next-line camelcase
                  duration_seconds: data.duration_seconds,
                  // eslint-disable-next-line camelcase
                  final_score: data.final_score,
                }}
              />
              <Title headingLevel="h3">Scores ({scoreTypeLabels[scoreType]})</Title>
              <ScoresList scores={data.scores} scoreType={scoreType} />
            </div>
            {settingsKeys.map((key) => {
              const record: Record<string, Record<string, unknown>> = Object.fromEntries(
                Object.entries(data.settings).map(([k, val]) => [k, val]),
              );
              return (
                <div key={key} className="autorag-print-page">
                  <div className="autorag-print-header">
                    <h1>{formatPatternName(data.name)}</h1>
                  </div>
                  <Title headingLevel="h2">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Title>
                  <KeyValueList entries={record[key] ?? {}} />
                </div>
              );
            })}
            {primaryEvaluationResults && primaryEvaluationResults.length > 0 && (
              <div className="autorag-print-page">
                <div className="autorag-print-header">
                  <h1>{formatPatternName(data.name)}</h1>
                </div>
                <Title headingLevel="h2">Sample Q&A</Title>
                {/* Print Q&A uses simplified layout without radar charts */}
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
