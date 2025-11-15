/* eslint-disable camelcase */
export type Namespace = {
  name: string;
  display_name?: string;
};

export type NamespacesResponse = {
  data: Namespace[];
};

export const mockNamespace = ({
  name = 'test-namespace',
  display_name,
}: Partial<Namespace> = {}): Namespace => ({
  name,
  display_name: display_name ?? name,
});

export const mockNamespaces = (namespaces?: Namespace[]): NamespacesResponse => ({
  data: namespaces ?? [
    mockNamespace({ name: 'crimson-show', display_name: 'Crimson Show' }),
    mockNamespace({ name: 'team-alpha', display_name: 'Team Alpha' }),
    mockNamespace({ name: 'default', display_name: 'Default' }),
  ],
});
