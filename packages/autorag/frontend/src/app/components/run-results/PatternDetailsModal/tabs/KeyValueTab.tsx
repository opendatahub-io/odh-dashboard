import React from 'react';
import type { AutoragPatternSettings, TabContentProps } from '~/app/types/autoragPattern';
import KeyValueList from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ComparisonKeyValueList from '~/app/components/run-results/PatternDetailsModal/components/ComparisonKeyValueList';

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
 * Comparison mode: renders a unified list with one label column and two value columns.
 *
 * Components created by this factory are cached in tabConfig.ts to preserve
 * React component identity across renders.
 */
export function createKeyValueTab(sectionKey: string): React.FC<TabContentProps> {
  const KeyValueTabComponent: React.FC<TabContentProps> = ({
    primaryPattern,
    comparisonPattern,
    onChangeComparisonPattern,
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
      <ComparisonKeyValueList
        primaryPattern={primaryPattern}
        comparisonPattern={comparisonPattern}
        primaryEntries={primaryEntries}
        comparisonEntries={comparisonEntries}
        onChangeComparisonPattern={onChangeComparisonPattern}
      />
    );
  };

  KeyValueTabComponent.displayName = `KeyValueTab(${sectionKey})`;
  return KeyValueTabComponent;
}
