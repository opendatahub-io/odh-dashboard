export type NavDataItem = {
  id?: string;
  label?: string;
  href?: string;
  group?: {
    id: string;
    title: string;
  };
  children?: NavDataItem[];
};

export const navData: NavDataItem[] = [
  {
    id: 'applications',
    group: { id: 'apps', title: 'Applications' },
    children: [
      { id: 'apps-installed', label: 'Enabled', href: '/' },
      { id: 'apps-explore', label: 'Explore', href: '/explore' },
    ],
  },
  { id: 'doc', label: 'Learning Paths', href: '/documentation' },
  { id: 'quick-starts', label: 'Quick starts', href: '/quickstarts' },
];
