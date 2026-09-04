import * as React from 'react';
import { Content, Flex, FlexItem } from '@patternfly/react-core';
import {
  adjustAdjacentPercentages,
  getDividerPosition,
  getWeightSegmentColor,
  MIN_SEGMENT_PERCENT,
  percentagesToWeights,
  weightsToPercentages,
} from '~/app/utilities/weightDistributionUtils';
import './WeightDistributionBar.scss';

export type WeightSegment = {
  label: string;
  weight: number;
  percentage: number;
};

type WeightDistributionBarProps = {
  segments: WeightSegment[];
  onWeightsChange?: (weights: number[]) => void;
};

const WeightDistributionBar: React.FC<WeightDistributionBarProps> = ({
  segments,
  onWeightsChange,
}) => {
  const barRef = React.useRef<HTMLDivElement>(null);
  const dragStateRef = React.useRef<{
    dividerIndex: number;
    startPercentages: number[];
    leftSumBeforePair: number;
    pairTotal: number;
  } | null>(null);

  const percentages = React.useMemo(
    () => weightsToPercentages(segments.map((segment) => segment.weight)),
    [segments],
  );

  const handleDragStart = React.useCallback(
    (dividerIndex: number) => {
      if (!barRef.current || !onWeightsChange) {
        return;
      }

      const leftSumBeforePair = percentages
        .slice(0, dividerIndex)
        .reduce((sum, value) => sum + value, 0);

      dragStateRef.current = {
        dividerIndex,
        startPercentages: percentages,
        leftSumBeforePair,
        pairTotal: percentages[dividerIndex] + percentages[dividerIndex + 1],
      };
    },
    [onWeightsChange, percentages],
  );

  const handleDragMove = React.useCallback(
    (clientX: number) => {
      const state = dragStateRef.current;
      if (!state || !barRef.current || !onWeightsChange) {
        return;
      }

      const barWidth = barRef.current.getBoundingClientRect().width;
      if (barWidth <= 0) {
        return;
      }

      const barLeft = barRef.current.getBoundingClientRect().left;
      const pointerPercent = ((clientX - barLeft) / barWidth) * 100;
      const nextLeftValue = pointerPercent - state.leftSumBeforePair;
      const nextPercentages = adjustAdjacentPercentages(
        state.startPercentages,
        state.dividerIndex,
        nextLeftValue,
        MIN_SEGMENT_PERCENT,
      );

      onWeightsChange(percentagesToWeights(nextPercentages));
    },
    [onWeightsChange],
  );

  const handleDragEnd = React.useCallback(() => {
    dragStateRef.current = null;
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dragStateRef.current) {
        event.preventDefault();
        handleDragMove(event.clientX);
      }
    };
    const handleMouseUp = () => {
      if (dragStateRef.current) {
        handleDragEnd();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleDragMove, handleDragEnd]);

  const handleKeyDown = React.useCallback(
    (dividerIndex: number, event: React.KeyboardEvent) => {
      if (!onWeightsChange) {
        return;
      }

      let delta = 0;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        delta = -1;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        delta = 1;
      } else {
        return;
      }

      event.preventDefault();
      const nextPercentages = adjustAdjacentPercentages(
        percentages,
        dividerIndex,
        percentages[dividerIndex] + delta,
        MIN_SEGMENT_PERCENT,
      );
      onWeightsChange(percentagesToWeights(nextPercentages));
    },
    [onWeightsChange, percentages],
  );

  if (segments.length === 0) {
    return null;
  }

  return (
    <div data-testid="weight-distribution">
      <div
        ref={barRef}
        className="weight-distribution-bar"
        aria-label="Benchmark weight distribution"
        data-testid="weight-distribution-bar"
      >
        {segments.map((segment, index) => (
          <div
            key={`${segment.label}-${index}`}
            className="weight-distribution-bar__segment"
            style={{
              flex: `0 0 ${percentages[index]}%`,
              backgroundColor: getWeightSegmentColor(index),
            }}
            role="img"
            aria-label={`${segment.label}: ${percentages[index]}%`}
            data-testid={`weight-segment-${index}`}
          >
            <span className="weight-distribution-bar__segment-label">{percentages[index]}%</span>
          </div>
        ))}
        {onWeightsChange
          ? segments.slice(0, -1).map((segment, index) => {
              const dividerPosition = getDividerPosition(percentages, index);
              return (
                <button
                  type="button"
                  key={`divider-${segment.label}-${index}`}
                  role="slider"
                  aria-orientation="vertical"
                  tabIndex={0}
                  className="weight-distribution-bar__divider"
                  style={{ left: `${dividerPosition}%` }}
                  aria-label={`Adjust weight between ${segment.label} and ${segments[index + 1].label}`}
                  aria-valuemin={MIN_SEGMENT_PERCENT}
                  aria-valuemax={100 - MIN_SEGMENT_PERCENT}
                  aria-valuenow={dividerPosition}
                  onMouseDown={() => handleDragStart(index)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  data-testid={`weight-divider-${index}`}
                >
                  <div className="weight-distribution-bar__divider-handle" aria-hidden="true" />
                </button>
              );
            })
          : null}
      </div>
      <Flex
        className="weight-distribution-bar__legend"
        gap={{ default: 'gapMd' }}
        data-testid="weight-distribution-legend"
      >
        {segments.map((segment, index) => (
          <FlexItem key={`${segment.label}-${index}`}>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              <FlexItem>
                <span
                  className="weight-distribution-bar__legend-dot"
                  style={{ backgroundColor: getWeightSegmentColor(index) }}
                />
              </FlexItem>
              <FlexItem>
                <Content component="small" className="weight-distribution-bar__legend-label">
                  {segment.label} {percentages[index]}%
                </Content>
              </FlexItem>
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </div>
  );
};

export default WeightDistributionBar;
