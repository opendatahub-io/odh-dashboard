import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import type { PatternDataBundle } from '~/app/types/autoragPattern';
import { flattenEntries } from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
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
  const primaryFlat = flattenEntries(primaryEntries);
  const comparisonFlat = flattenEntries(comparisonEntries);

  return (
    <DescriptionList isHorizontal className="autorag-comparison-list">
      <DescriptionListGroup>
        <DescriptionListTerm> </DescriptionListTerm>
        <DescriptionListDescription>
          <Grid hasGutter>
            <GridItem span={6}>
              <ComparisonColumnHeader
                patternName={primaryPattern.pattern.name}
                rank={primaryPattern.rank}
                label="selected pattern"
                data-testid="comparison-column-header-primary"
              />
            </GridItem>
            <GridItem span={6}>
              <ComparisonColumnHeader
                patternName={comparisonPattern.pattern.name}
                rank={comparisonPattern.rank}
                onChangeClick={onChangeComparisonPattern}
                data-testid="comparison-column-header-comparison"
              />
            </GridItem>
          </Grid>
        </DescriptionListDescription>
      </DescriptionListGroup>
      {primaryFlat.map(([label, primaryValue], i) => (
        <DescriptionListGroup key={label}>
          <DescriptionListTerm>{label}</DescriptionListTerm>
          <DescriptionListDescription>
            <Grid hasGutter>
              <GridItem span={6}>{primaryValue}</GridItem>
              <GridItem span={6}>{comparisonFlat[i]?.[1]}</GridItem>
            </Grid>
          </DescriptionListDescription>
        </DescriptionListGroup>
      ))}
      {children}
    </DescriptionList>
  );
};

export default ComparisonKeyValueList;
