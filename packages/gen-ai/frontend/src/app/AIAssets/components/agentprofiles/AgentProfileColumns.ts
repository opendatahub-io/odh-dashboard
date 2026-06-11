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
    sortable: (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
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
