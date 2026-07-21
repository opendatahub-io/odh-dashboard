import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import type { PatternDataBundle } from '~/app/types/autoragPattern';
import {
  computeTermWidth,
  flattenEntries,
} from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ComparisonColumnHeader from '~/app/components/run-results/PatternDetailsModal/components/ComparisonColumnHeader';

type ComparisonKeyValueListProps = {
  primaryPattern: PatternDataBundle;
  comparisonPattern: PatternDataBundle;
  primaryEntries: Record<string, unknown>;
  comparisonEntries: Record<string, unknown>;
  onChangeComparisonPattern?: () => void;
  /** Extra DescriptionListGroup elements rendered after the key-value rows. */
  children?: React.ReactNode;
};

/**
 * A comparison-mode DescriptionList with column headers and side-by-side values.
 *
 * Renders:
 *  - A header row with primary/comparison pattern names
 *  - One row per key-value pair with shared label and two value columns
 *  - Optional children (e.g. score type selector) appended after the rows
 */
const ComparisonKeyValueList: React.FC<ComparisonKeyValueListProps> = ({
  primaryPattern,
  comparisonPattern,
  primaryEntries,
  comparisonEntries,
  onChangeComparisonPattern,
  children,
}) => {
  const primaryFlat = React.useMemo(() => flattenEntries(primaryEntries), [primaryEntries]);
  const comparisonFlat = React.useMemo(
    () => flattenEntries(comparisonEntries),
    [comparisonEntries],
  );
  const comparisonMap = React.useMemo(() => new Map(comparisonFlat), [comparisonFlat]);

  const customStyle: Record<string, string> = React.useMemo(
    () => ({
      '--pf-v6-c-description-list__term--width': computeTermWidth([
        'Pattern',
        ...primaryFlat.map(([label]) => label),
      ]),
    }),
    [primaryFlat],
  );

  return (
    <DescriptionList isHorizontal className="autorag-comparison-list" style={customStyle}>
      <DescriptionListGroup className="autorag-comparison-list__header-row">
        <DescriptionListTerm>Pattern</DescriptionListTerm>
        <DescriptionListDescription>
          <Flex gap={{ default: 'gapMd' }}>
            <FlexItem flex={{ default: 'flex_1' }}>
              <ComparisonColumnHeader
                patternName={primaryPattern.pattern.name}
                rank={primaryPattern.rank}
                label="selected pattern"
                data-testid="comparison-column-header-primary"
              />
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <ComparisonColumnHeader
                patternName={comparisonPattern.pattern.name}
                rank={comparisonPattern.rank}
                onChangeClick={onChangeComparisonPattern}
                data-testid="comparison-column-header-comparison"
              />
            </FlexItem>
          </Flex>
        </DescriptionListDescription>
      </DescriptionListGroup>
      {primaryFlat.map(([label, primaryValue], idx) => (
        <DescriptionListGroup key={`${label}-${idx}`}>
          <DescriptionListTerm>{label}</DescriptionListTerm>
          <DescriptionListDescription>
            <Flex gap={{ default: 'gapMd' }}>
              <FlexItem flex={{ default: 'flex_1' }}>{primaryValue}</FlexItem>
              <FlexItem flex={{ default: 'flex_1' }}>
                {comparisonMap.get(label) ?? '\u2014'}
              </FlexItem>
            </Flex>
          </DescriptionListDescription>
        </DescriptionListGroup>
      ))}
      {children}
    </DescriptionList>
  );
};

export default ComparisonKeyValueList;
