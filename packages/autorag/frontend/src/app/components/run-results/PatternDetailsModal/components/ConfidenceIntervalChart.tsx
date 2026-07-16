import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Popover,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { AutoragPatternScoreMetric, AutoragPatternScores } from '~/app/types/autoragPattern';
import { humanize } from '~/app/utilities/utils';

const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];
const INNER_TICKS = [0.25, 0.5, 0.75];

type ScoreEntry = { mean: number; ci_low: number | null; ci_high: number | null };

const DiamondMarker: React.FC<{
  className: string;
  style?: React.CSSProperties;
  testId?: string;
  ariaLabel: string;
}> = ({ className, style, testId, ariaLabel }) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    className={className}
    style={style}
    data-testid={testId}
    tabIndex={0}
    role="img"
    aria-label={ariaLabel}
  >
    <polygon points="6,0 12,6 6,12 0,6" />
  </svg>
);

const CircleMarker: React.FC<{
  className: string;
  style?: React.CSSProperties;
  testId?: string;
  ariaLabel: string;
}> = ({ className, style, testId, ariaLabel }) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    className={className}
    style={style}
    data-testid={testId}
    tabIndex={0}
    role="img"
    aria-label={ariaLabel}
  >
    <circle cx={6} cy={6} r={6} />
  </svg>
);

const CIBarWithMarkers: React.FC<{
  score: ScoreEntry;
  testIdPrefix: string;
}> = ({ score, testIdPrefix }) => (
  <div className="autorag-ci-track__bar">
    {score.ci_low != null && (
      <Tooltip content={`CI low: ${score.ci_low.toFixed(3)}`}>
        <DiamondMarker
          className="autorag-ci-marker autorag-ci-marker--ci-low"
          style={{ left: `${score.ci_low * 100}%` }}
          testId={`ci-marker-low-${testIdPrefix}`}
          ariaLabel={`CI low: ${score.ci_low.toFixed(3)}`}
        />
      </Tooltip>
    )}
    <Tooltip content={`Mean: ${score.mean.toFixed(3)}`}>
      <CircleMarker
        className="autorag-ci-marker autorag-ci-marker--mean"
        style={{ left: `${score.mean * 100}%` }}
        testId={`ci-marker-mean-${testIdPrefix}`}
        ariaLabel={`Mean: ${score.mean.toFixed(3)}`}
      />
    </Tooltip>
    {score.ci_high != null && (
      <Tooltip content={`CI high: ${score.ci_high.toFixed(3)}`}>
        <DiamondMarker
          className="autorag-ci-marker autorag-ci-marker--ci-high"
          style={{ left: `${score.ci_high * 100}%` }}
          testId={`ci-marker-high-${testIdPrefix}`}
          ariaLabel={`CI high: ${score.ci_high.toFixed(3)}`}
        />
      </Tooltip>
    )}
  </div>
);

const CIScoreTrack: React.FC<{
  metricKey: string;
  score: ScoreEntry;
}> = ({ metricKey, score }) => (
  <div className="autorag-ci-track" data-testid={`ci-track-${metricKey}`}>
    <div className="autorag-ci-track__label">
      <Content component={ContentVariants.p}>{humanize(metricKey)}</Content>
    </div>
    <CIBarWithMarkers score={score} testIdPrefix={metricKey} />
  </div>
);

const AxisTicks: React.FC = () => (
  <div className="autorag-ci-ticks">
    {INNER_TICKS.map((tick) => (
      <div key={tick} className="autorag-ci-tick" style={{ left: `${tick * 100}%` }} />
    ))}
  </div>
);

const AxisLabels: React.FC<{ testId?: string }> = ({ testId }) => (
  <div className="autorag-ci-axis" data-testid={testId}>
    {AXIS_TICKS.map((tick) => (
      <span key={tick}>{tick}</span>
    ))}
  </div>
);

const CIColumn: React.FC<{
  label: string;
  scores: AutoragPatternScores;
  scoreKeys: string[];
  testIdSuffix: string;
}> = ({ label, scores, scoreKeys, testIdSuffix }) => (
  <div className="autorag-ci-column" data-testid={`ci-column-${testIdSuffix}`}>
    <div className="autorag-ci-column__header">
      <Content component={ContentVariants.small}>{label}</Content>
    </div>
    <div className="autorag-ci-column__chart-area">
      <div className="autorag-ci-column__tracks">
        {scoreKeys.map((key) => {
          const score = scores[key];
          if (!score) {
            return <div key={key} className="autorag-ci-track autorag-ci-track--empty" />;
          }
          return (
            <div key={key} className="autorag-ci-track">
              <CIBarWithMarkers score={score} testIdPrefix={`${key}-${testIdSuffix}`} />
            </div>
          );
        })}
      </div>
      <AxisTicks />
    </div>
    <AxisLabels />
  </div>
);

const LegendDiamond: React.FC<{ className: string }> = ({ className }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
    <polygon points="6,0 12,6 6,12 0,6" className={className} />
  </svg>
);

const LegendCircle: React.FC = () => (
  <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
    <circle cx={6} cy={6} r={6} className="autorag-ci-marker--mean" />
  </svg>
);

const CILegend: React.FC = () => (
  <Flex
    className="autorag-ci-legend"
    gap={{ default: 'gapLg' }}
    alignItems={{ default: 'alignItemsCenter' }}
    data-testid="ci-legend"
  >
    <FlexItem>
      <Content component={ContentVariants.small}>95% confidence interval</Content>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendDiamond className="autorag-ci-marker--ci-low" />
        <Content component={ContentVariants.small}>CI low</Content>
      </span>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendDiamond className="autorag-ci-marker--ci-high" />
        <Content component={ContentVariants.small}>CI high</Content>
      </span>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendCircle />
        <Content component={ContentVariants.small}>Mean score</Content>
      </span>
    </FlexItem>
  </Flex>
);

function getScoreEntries(scores: AutoragPatternScores): [string, ScoreEntry][] {
  return Object.entries(scores).filter(
    (entry): entry is [string, AutoragPatternScoreMetric] => entry[1] != null,
  );
}

const ConfidenceIntervalChart: React.FC<{
  scores: AutoragPatternScores;
  comparisonScores?: AutoragPatternScores;
  primaryLabel?: string;
  comparisonLabel?: string;
  'data-testid'?: string;
}> = ({
  scores,
  comparisonScores,
  primaryLabel,
  comparisonLabel,
  'data-testid': testId = 'ci-scores-chart',
}) => {
  const scoreEntries = getScoreEntries(scores);
  const comparisonEntries = comparisonScores ? getScoreEntries(comparisonScores) : [];

  if (scoreEntries.length === 0 && comparisonEntries.length === 0) {
    return null;
  }

  const isComparison = comparisonScores != null;
  const scoreKeys = isComparison
    ? Array.from(new Set([...scoreEntries, ...comparisonEntries].map(([key]) => key)))
    : scoreEntries.map(([key]) => key);

  return (
    <div className="autorag-ci-scores" data-testid={testId}>
      <div className="autorag-ci-scores__header">
        <Title headingLevel="h3">Confidence interval (CI) scores</Title>
        <Popover
          bodyContent="Confidence interval scores show the statistical range of each evaluation metric. The CI low and CI high markers represent the 95% confidence interval bounds around the mean score."
          position="top"
        >
          <Button
            variant="plain"
            aria-label="Confidence interval scores info"
            icon={<OutlinedQuestionCircleIcon />}
          />
        </Popover>
      </div>
      <Content component={ContentVariants.p} className="autorag-ci-scores__description">
        {isComparison
          ? 'Each pattern plots mean, CI low, and CI high on its own 0–1 x-axis. Metric labels are shared on the left. Hover the markers for exact values.'
          : 'Each optimization metric is plotted on a shared 0–1 x-axis. Hover the markers on each track for exact CI low, mean, and CI high values.'}
      </Content>
      {isComparison ? (
        <div className="autorag-ci-scores__comparison">
          <div className="autorag-ci-scores__labels">
            <div className="autorag-ci-column__header" />
            {scoreKeys.map((key) => (
              <div key={key} className="autorag-ci-track">
                <Content component={ContentVariants.p}>{humanize(key)}</Content>
              </div>
            ))}
          </div>
          <CIColumn
            label={primaryLabel ?? ''}
            scores={scores}
            scoreKeys={scoreKeys}
            testIdSuffix="primary"
          />
          <CIColumn
            label={comparisonLabel ?? ''}
            scores={comparisonScores}
            scoreKeys={scoreKeys}
            testIdSuffix="comparison"
          />
        </div>
      ) : (
        <>
          <div className="autorag-ci-scores__chart-area">
            <div className="autorag-ci-scores__tracks">
              {scoreEntries.map(([key, score]) => (
                <CIScoreTrack key={key} metricKey={key} score={score} />
              ))}
            </div>
            <AxisTicks />
          </div>
          <AxisLabels testId="ci-axis" />
        </>
      )}
      <CILegend />
    </div>
  );
};

export default ConfidenceIntervalChart;
