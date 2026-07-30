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
import { formatMetricName } from '~/app/utilities/utils';
import { METRIC_DESCRIPTIONS } from '~/app/utilities/const';
import InlineTooltip from '~/app/components/InlineTooltip';

const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];
const INNER_TICKS = [0.25, 0.5, 0.75];

const DiamondMarker: React.FC<
  { testId?: string; ariaLabel: string } & React.SVGProps<SVGSVGElement>
> = ({ testId, ariaLabel, ...rest }) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    data-testid={testId}
    tabIndex={0}
    role="img"
    aria-label={ariaLabel}
    {...rest}
  >
    <polygon points="6,0 12,6 6,12 0,6" />
  </svg>
);

const CircleMarker: React.FC<
  { testId?: string; ariaLabel: string } & React.SVGProps<SVGSVGElement>
> = ({ testId, ariaLabel, ...rest }) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    data-testid={testId}
    tabIndex={0}
    role="img"
    aria-label={ariaLabel}
    {...rest}
  >
    <circle cx={6} cy={6} r={6} />
  </svg>
);

const CIBarWithMarkers: React.FC<{
  score: AutoragPatternScoreMetric;
  testIdPrefix: string;
}> = ({ score, testIdPrefix }) => (
  <div className="autorag-ci-track__bar">
    {score.ci_low != null && (
      <Tooltip content={`CI low: ${score.ci_low.toFixed(3)}`}>
        <DiamondMarker
          className="autorag-ci-marker m-ci-low"
          style={{ left: `${score.ci_low * 100}%` }}
          testId={`ci-marker-low-${testIdPrefix}`}
          ariaLabel={`CI low: ${score.ci_low.toFixed(3)}`}
        />
      </Tooltip>
    )}
    {score.mean != null && (
      <Tooltip content={`Mean: ${score.mean.toFixed(3)}`}>
        <CircleMarker
          className="autorag-ci-marker m-mean"
          style={{ left: `${score.mean * 100}%` }}
          testId={`ci-marker-mean-${testIdPrefix}`}
          ariaLabel={`Mean: ${score.mean.toFixed(3)}`}
        />
      </Tooltip>
    )}
    {score.ci_high != null && (
      <Tooltip content={`CI high: ${score.ci_high.toFixed(3)}`}>
        <DiamondMarker
          className="autorag-ci-marker m-ci-high"
          style={{ left: `${score.ci_high * 100}%` }}
          testId={`ci-marker-high-${testIdPrefix}`}
          ariaLabel={`CI high: ${score.ci_high.toFixed(3)}`}
        />
      </Tooltip>
    )}
  </div>
);

const MetricLabel: React.FC<{ metricKey: string }> = ({ metricKey }) => {
  const label = formatMetricName(metricKey);
  const description = METRIC_DESCRIPTIONS[metricKey];
  return (
    <Content component={ContentVariants.p}>
      {description ? <InlineTooltip text={label} tooltip={description} /> : label}
    </Content>
  );
};

const CIScoreTrack: React.FC<{
  metricKey: string;
  score: AutoragPatternScoreMetric;
}> = ({ metricKey, score }) => (
  <div className="autorag-ci-track" data-testid={`ci-track-${metricKey}`}>
    <div className="autorag-ci-track__label">
      <MetricLabel metricKey={metricKey} />
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
            return <div key={key} className="autorag-ci-track m-empty" />;
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
    <circle cx={6} cy={6} r={6} className="m-mean" />
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
        <LegendDiamond className="m-ci-low" />
        <Content component={ContentVariants.small}>CI low</Content>
      </span>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendCircle />
        <Content component={ContentVariants.small}>Mean score</Content>
      </span>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendDiamond className="m-ci-high" />
        <Content component={ContentVariants.small}>CI high</Content>
      </span>
    </FlexItem>
  </Flex>
);

function hasData(score: AutoragPatternScoreMetric): boolean {
  return (score.mean != null && score.mean > 0) || score.ci_low != null || score.ci_high != null;
}

function getScoreEntries(scores: AutoragPatternScores): [string, AutoragPatternScoreMetric][] {
  return Object.entries(scores).filter(
    (entry): entry is [string, AutoragPatternScoreMetric] => entry[1] != null && hasData(entry[1]),
  );
}

type ConfidenceIntervalChartProps = {
  scores: AutoragPatternScores;
  comparisonScores?: AutoragPatternScores;
  primaryLabel?: string;
  comparisonLabel?: string;
  'data-testid'?: string;
};

const ConfidenceIntervalChart: React.FC<ConfidenceIntervalChartProps> = ({
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
            data-testid="ci-scores-info"
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
            <div className="autorag-ci-column__header">&nbsp;</div>
            {scoreKeys.map((key) => (
              <div key={key} className="autorag-ci-track">
                <MetricLabel metricKey={key} />
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
