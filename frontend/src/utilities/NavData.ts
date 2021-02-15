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
    group: { id: 'apps', title: 'Applications' },
    children: [
      { id: 'apps-installed', label: 'Installed', href: '/' },
      { id: 'apps-explore', label: 'Explore', href: '/explore' },
    ],
  },
  { id: 'quick-starts', label: 'Quick starts', href: '/quickstarts' },
  { id: 'doc', label: 'Documentation', href: '/documentation' },
];
