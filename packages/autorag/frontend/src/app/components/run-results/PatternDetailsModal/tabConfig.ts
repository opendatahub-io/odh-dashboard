import type { TabDefinition } from '~/app/types/autoragPattern';
import PatternInformationTab from './tabs/PatternInformationTab';
import SampleQATab from './tabs/SampleQATab';
import { createKeyValueTab } from './tabs/KeyValueTab';

const OVERVIEW_KEY = 'pattern_information';
const SAMPLE_QA_KEY = 'sample_qa';

// When the backend adds a new settings section key, a matching entry must be
// added here or the section will be silently omitted from the modal.
export const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: OVERVIEW_KEY,
    label: 'Pattern information',
    tooltip: 'Review pattern performance, evaluation metrics, and confidence intervals.',
    description:
      'Summarizes pattern name, iteration, run duration, final score, and confidence interval scores for this pattern.',
    section: 'Pattern configuration',
    component: PatternInformationTab,
  },
  {
    key: 'vector_store_binding',
    label: 'Vector store binding',
    tooltip:
      'Vector store settings define where embedded document chunks are stored for retrieval at query time.',
    description: 'Shows the vector store datasource type and collection name used by this pattern.',
    section: 'Pattern configuration',
    component: createKeyValueTab('vector_store_binding'),
  },
  {
    key: 'chunking',
    label: 'Chunking',
    tooltip:
      'Chunking parameters affect retrieval granularity and how much context is passed to the generation model.',
    description:
      'Shows how source documents are split into chunks, including method, size, and overlap.',
    section: 'Pattern configuration',
    component: createKeyValueTab('chunking'),
  },
  {
    key: 'embedding',
    label: 'Embedding',
    tooltip:
      'Embedding configuration determines how text is converted into vectors for similarity search and retrieval.',
    description:
      'Lists the embedding model ID, distance metric, dimensions, context length, timeout, and provider details.',
    section: 'Pattern configuration',
    component: createKeyValueTab('embedding'),
  },
  {
    key: 'retrieval',
    label: 'Retrieval',
    tooltip:
      'Retrieval settings control which chunks are selected and ranked before answer generation.',
    description:
      'Shows retrieval method, chunk count, search mode, and hybrid ranker settings used to select context.',
    section: 'Retrieval & generation',
    component: createKeyValueTab('retrieval'),
  },
  {
    key: 'generation',
    label: 'Generation',
    tooltip:
      'Generation settings define how the model formats context, user questions, and system instructions.',
    description:
      'Shows the generation model ID and prompt templates used to compose answers from retrieved context.',
    section: 'Retrieval & generation',
    component: createKeyValueTab('generation'),
  },
  {
    key: SAMPLE_QA_KEY,
    label: 'Sample Q&A',
    tooltip:
      'Sample Q&A helps stakeholders review grounding quality and compare generated answers against expected references.',
    description:
      'Shows sample questions with evaluation radar charts, generated answers, and expandable expected answer references.',
    section: 'Retrieval & generation',
    component: SampleQATab,
  },
];

const NON_SETTINGS_KEYS = new Set([OVERVIEW_KEY, SAMPLE_QA_KEY]);

export function getVisibleTabs(
  settingsKeys: Set<string>,
  hasEvaluationResults: boolean,
): TabDefinition[] {
  return TAB_DEFINITIONS.filter((tab) => {
    if (tab.key === SAMPLE_QA_KEY) {
      return hasEvaluationResults;
    }
    if (NON_SETTINGS_KEYS.has(tab.key)) {
      return true;
    }
    return settingsKeys.has(tab.key);
  });
}

export { OVERVIEW_KEY, SAMPLE_QA_KEY };
