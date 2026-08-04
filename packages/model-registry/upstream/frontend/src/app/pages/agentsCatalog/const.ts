import type { AgentFilterCategoryKey } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';

export const AGENTS_CATALOG_TITLE = 'Agents Catalog';
export const AGENTS_CATALOG_DESCRIPTION =
  'Discover agent templates that are available for your organization.';

export const AGENT_FILTER_KEYS: AgentFilterCategoryKey[] = ['framework'];

export const AGENT_FILTER_CATEGORY_NAMES: Record<AgentFilterCategoryKey, string> = {
  framework: 'Framework',
};

export const AGENT_FRAMEWORK_LABEL_MAPPING: Record<string, string> = {
  a2a: 'A2A',
  autogen: 'Autogen',
  'claude-code': 'Claude Code',
  crewai: 'CrewAI',
  'google-adk': 'Google ADK',
  langflow: 'Langflow',
  langgraph: 'LangGraph',
  llamaindex: 'LlamaIndex',
  openclaw: 'OpenClaw',
  opencode: 'OpenCode',
  vanilla_python: 'Python', // eslint-disable-line camelcase
};

export const AGENT_LABEL_MAPPINGS: Record<string, Record<string, string>> = {
  framework: AGENT_FRAMEWORK_LABEL_MAPPING,
};

export const BACKEND_TO_FRONTEND_AGENT_FILTER_KEY: Record<string, AgentFilterCategoryKey> = {};

export const AGENTS_CATALOG_GALLERY = {
  CARDS_PER_ROW: 4,
  PAGE_SIZE: 10,
} as const;

type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const GRID_COLUMNS = 12;
const GRID_SPAN_VALUES: GridSpan[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function toGridSpan(cols: number): GridSpan {
  const index = Math.min(Math.max(0, cols - 1), GRID_SPAN_VALUES.length - 1);
  return GRID_SPAN_VALUES[index];
}

export const AGENTS_CATALOG_GRID_SPAN: {
  sm: GridSpan;
  md: GridSpan;
  lg: GridSpan;
  xl2: GridSpan;
} = {
  sm: toGridSpan(GRID_COLUMNS),
  md: toGridSpan(GRID_COLUMNS / 2),
  lg: toGridSpan(GRID_COLUMNS / AGENTS_CATALOG_GALLERY.CARDS_PER_ROW),
  xl2: toGridSpan(GRID_COLUMNS / AGENTS_CATALOG_GALLERY.CARDS_PER_ROW),
};

export const OTHER_AGENTS_DISPLAY_NAME = 'Other agents';
