import type { AutoragPattern, TabDefinition } from '~/app/types/autoragPattern';
import { humanize } from '~/app/utilities/utils';
import PatternInformationTab from './tabs/PatternInformationTab';
import SampleQATab from './tabs/SampleQATab';
import { createKeyValueTab } from './tabs/KeyValueTab';

const OVERVIEW_KEY = 'pattern_information';
const SAMPLE_QA_KEY = 'sample_qa';

/**
 * Static tab definitions that are always present.
 */
const FIXED_TABS: TabDefinition[] = [
  {
    key: OVERVIEW_KEY,
    label: 'Pattern information',
    component: PatternInformationTab,
  },
];

const SAMPLE_QA_TAB: TabDefinition = {
  key: SAMPLE_QA_KEY,
  label: 'Sample Q&A',
  component: SampleQATab,
};

/**
 * Module-level cache: maps settings section keys (e.g. 'chunking') to their
 * factory-created React components. Preserves component identity across renders
 * so React doesn't unmount/remount tabs (which would lose internal state).
 */
const keyValueTabCache = new Map<string, TabDefinition['component']>();

function getOrCreateKeyValueTab(sectionKey: string): TabDefinition['component'] {
  let component = keyValueTabCache.get(sectionKey);
  if (!component) {
    component = createKeyValueTab(sectionKey);
    keyValueTabCache.set(sectionKey, component);
  }
  return component;
}

/**
 * Builds the visible tab list for a given pattern and evaluation state.
 *
 * Tab order: [Pattern information] + [dynamic settings tabs] + [Sample Q&A]
 *
 * The three tab categories correspond to different data sources:
 * - Pattern information: top-level fields on AutoragPattern (name, scores, etc.)
 * - Settings tabs: created dynamically from `pattern.settings` keys — all sections
 *   are key-value shaped, so they share the KeyValueTab factory. New settings
 *   sections from the backend appear automatically without code changes.
 * - Sample Q&A: loaded separately from S3 via usePatternEvaluationResults, only
 *   shown when evaluation results exist.
 *
 * To add a custom tab with non-key-value rendering, create a dedicated component
 * and add it to FIXED_TABS or handle it as a special case (like SAMPLE_QA_TAB).
 */
export function getVisibleTabs(
  pattern: AutoragPattern,
  hasEvaluationResults: boolean,
): TabDefinition[] {
  const settingsTabs: TabDefinition[] = Object.keys(pattern.settings).map((key) => ({
    key,
    label: humanize(key),
    component: getOrCreateKeyValueTab(key),
  }));

  return [...FIXED_TABS, ...settingsTabs, ...(hasEvaluationResults ? [SAMPLE_QA_TAB] : [])];
}

export { OVERVIEW_KEY, SAMPLE_QA_KEY };
