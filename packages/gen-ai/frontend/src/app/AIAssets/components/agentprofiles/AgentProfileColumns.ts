import { SortableData } from 'mod-arch-shared';
import { AgentProfileSummary } from '~/app/agentProfile/types';

const AgentProfileColumns: SortableData<AgentProfileSummary>[] = [
  {
    field: 'displayName',
    label: 'Name',
    sortable: (a, b) => a.displayName.localeCompare(b.displayName),
    width: 25,
  },
  {
    field: 'description',
    label: 'Description',
    sortable: false,
    width: 40,
  },
  {
    field: 'lastModified',
    label: 'Last modified',
    sortable: (a: AgentProfileSummary, b: AgentProfileSummary): number => {
      const ta = Date.parse(a.lastModified);
      const tb = Date.parse(b.lastModified);
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    },
    width: 20,
  },
  {
    field: 'actions',
    label: '',
    sortable: false,
    width: 15,
  },
];

export default AgentProfileColumns;
