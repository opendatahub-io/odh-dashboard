import { SortableData } from '@odh-dashboard/ui-core';
import {
  MaaSAuthPolicy,
  MaaSSubscription,
  SubscriptionPolicyFormDataResponse,
} from '~/app/types/subscriptions';

export type ModelOverviewRow = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  subscriptions: MaaSSubscription[];
  policies: MaaSAuthPolicy[];
};

export const buildModelOverviewRows = (
  formData: SubscriptionPolicyFormDataResponse,
): ModelOverviewRow[] => {
  const { modelRefs, subscriptions, policies } = formData;

  const refsMatch = (refs: { name: string; namespace: string }[], model: (typeof modelRefs)[0]) =>
    refs.some((ref) => ref.name === model.name && ref.namespace === model.namespace);

  return modelRefs.map((model) => ({
    name: model.name,
    namespace: model.namespace,
    displayName: model.displayName,
    description: model.description,
    subscriptions: subscriptions.filter((sub) => refsMatch(sub.modelRefs, model)),
    policies: policies.filter((policy) => refsMatch(policy.modelRefs, model)),
  }));
};

export const overviewColumns: SortableData<ModelOverviewRow>[] = [
  {
    label: '',
    field: 'expand',
    sortable: false,
  },
  {
    label: 'Model name',
    field: 'name',
    sortable: (a, b) => (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'Subscriptions',
    field: 'subscriptions',
    width: 15,
    sortable: (a, b) => a.subscriptions.length - b.subscriptions.length,
  },
  {
    label: 'Authorization policies',
    field: 'policies',
    width: 15,
    sortable: (a, b) => a.policies.length - b.policies.length,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];
