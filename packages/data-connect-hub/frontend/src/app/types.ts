// Types ---------------------------------------------------------------------->

export type Identified<I> = {
  id: I;
};

export type Labelled<L> = {
  label: L;
};

export type Described<D> = {
  description: D;
};

export type Valued<V> = {
  value: V;
};

export type Iconed<I> = {
  icon: I;
};

export type Colored<C> = {
  color: C;
};

export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string;
  'openshift.io/display-name': string;
}>;

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type ListConfigSecretsResponse = {
  secrets: { name: string; keys: string[] }[];
  configMaps: { name: string; keys: string[] }[];
};

export type ConfigSecretItem = {
  name: string;
  keys: string[];
};

export type NamespaceKind = {
  name: string;
  displayName?: string;
};

export type { Connection } from '~/types/connection';
export type {
  ConnectionType,
  ConnectionTypeCredentialField,
  ConnectionTypeEnumValue,
} from '~/types/connection-type';

export type ConnectionNameAvailability = {
  available: boolean;
  conflicts_with: string[];
};

export type TestCredentialsRequest = {
  data_connection_type_id: string;
  credentials: Record<string, string>;
};

export type CreateConnectionRequest = {
  name: string;
  description?: string | null;
  data_connection_type_id: string;
  format: 'tabular' | 'binary';
  credentials: {
    secret: string;
    properties: Record<string, string>;
  };
  properties: Record<string, string>;
};

// Helpers -------------------------------------------------------------------->

export function IdentifiedLabelledToValuedLabelled<I extends PropertyKey, L>(
  original: Identified<I> & Labelled<L>,
): Record<I, Valued<I> & Labelled<L>> {
  return {
    [original.id]: {
      value: original.id,
      label: original.label,
    },
  } as Record<I, Valued<I> & Labelled<L>>;
}
