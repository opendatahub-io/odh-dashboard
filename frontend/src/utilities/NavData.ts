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
  { id: 'projects', label: 'Data projects', href: '/data-projects' },
  { id: 'resources', label: 'Resources', href: '/resources' },
];

export const adminNavData: NavDataItem[] = [
  {
    id: 'applications',
    group: { id: 'apps', title: 'Applications' },
    children: [
      { id: 'apps-installed', label: 'Enabled', href: '/' },
      { id: 'apps-explore', label: 'Explore', href: '/explore' },
    ],
  },
  { id: 'resources', label: 'Resources', href: '/resources' },
  {
    id: 'settings',
    group: { id: 'settings', title: 'Settings' },
    children: [
      { id: 'settings-cluster-settings', label: 'Cluster settings', href: '/clusterSettings' },
    ],
  },
];
