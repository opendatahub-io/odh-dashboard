import React from 'react';
import { Grid, GridItem } from '@patternfly/react-core';
import type { AutoragPatternSettings, TabContentProps } from '~/app/types/autoragPattern';
import KeyValueList from '../components/KeyValueList';
import ComparisonColumnHeader from '../components/ComparisonColumnHeader';

/**
 * Extracts a named section from pattern settings as a generic record.
 */
const settingsSectionEntries = (
  settings: AutoragPatternSettings,
  section: string,
): Record<string, unknown> => {
  const record: Record<string, Record<string, unknown>> = Object.fromEntries(
    Object.entries(settings).map(([key, val]) => [key, val]),
  );
  return record[section] ?? {};
};

export { settingsSectionEntries };

/**
 * Factory that creates a tab component for a given pattern.settings section key
 * (e.g. 'chunking', 'embedding'). All settings sections are key-value shaped,
 * so this single factory powers Vector Store, Chunking, Embedding, Retrieval,
 * Generation, and Agent tabs.
 *
 * Single mode: renders a flat DescriptionList of key-value pairs.
 * Comparison mode: renders two side-by-side columns with column headers.
 *
 * Components created by this factory are cached in tabConfig.ts to preserve
 * React component identity across renders.
 */
export function createKeyValueTab(sectionKey: string): React.FC<TabContentProps> {
  const KeyValueTabComponent: React.FC<TabContentProps> = ({
    primaryPattern,
    comparisonPattern,
  }) => {
    const primaryEntries = settingsSectionEntries(primaryPattern.pattern.settings, sectionKey);

    if (!comparisonPattern) {
      return <KeyValueList entries={primaryEntries} />;
    }

    const comparisonEntries = settingsSectionEntries(
      comparisonPattern.pattern.settings,
      sectionKey,
    );

    return (
      <>
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
              data-testid="comparison-column-header-comparison"
            />
          </GridItem>
        </Grid>
        <Grid hasGutter className="pf-v6-u-mt-md">
          <GridItem span={6}>
            <KeyValueList entries={primaryEntries} />
          </GridItem>
          <GridItem span={6}>
            <KeyValueList entries={comparisonEntries} />
          </GridItem>
        </Grid>
      </>
    );
  };

  KeyValueTabComponent.displayName = `KeyValueTab(${sectionKey})`;
  return KeyValueTabComponent;
}
