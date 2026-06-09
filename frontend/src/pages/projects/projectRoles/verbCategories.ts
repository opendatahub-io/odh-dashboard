export type VerbInfo = {
  verb: string;
  label: string;
  description: string;
};

export type VerbCategory = {
  id: string;
  label: string;
  description: string;
  verbs: VerbInfo[];
};

export const VERB_CATEGORIES: VerbCategory[] = [
  {
    id: 'cat-create',
    label: 'Create operations',
    description: 'Create resources',
    verbs: [{ verb: 'create', label: 'Create', description: 'Create new resources' }],
  },
  {
    id: 'cat-read',
    label: 'Read operations',
    description: 'View and monitor resources',
    verbs: [
      { verb: 'get', label: 'Get', description: 'Read individual resources' },
      { verb: 'list', label: 'List', description: 'List multiple resources' },
      { verb: 'watch', label: 'Watch', description: 'Watch for resource changes' },
    ],
  },
  {
    id: 'cat-update',
    label: 'Update operations',
    description: 'Modify resources',
    verbs: [
      { verb: 'update', label: 'Update', description: 'Update resources' },
      { verb: 'patch', label: 'Patch', description: 'Partially update resources' },
    ],
  },
  {
    id: 'cat-delete',
    label: 'Delete operations',
    description: 'Remove resources',
    verbs: [
      { verb: 'delete', label: 'Delete', description: 'Delete individual resources' },
      {
        verb: 'deletecollection',
        label: 'Delete collection',
        description: 'Delete multiple resources at once',
      },
    ],
  },
];

export const ALL_VERBS_WILDCARD = '*';

export const ALL_INDIVIDUAL_VERBS = VERB_CATEGORIES.flatMap((c) => c.verbs.map((v) => v.verb));
