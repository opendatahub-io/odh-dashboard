import type { EitherNotBoth } from '@openshift/dynamic-plugin-sdk';

export enum ContainerResourceAttributes {
  CPU = 'cpu',
  MEMORY = 'memory',
}

export type ContainerResources = {
  requests?: {
    [key: string]: number | string | undefined;
    cpu?: string | number;
    memory?: string;
  };
  limits?: {
    [key: string]: number | string | undefined;
    cpu?: string | number;
    memory?: string;
  };
};

export type EnvironmentVariable = EitherNotBoth<
  { value: string | number },
  { valueFrom: Record<string, unknown> }
> & {
  name: string;
};

export type SecretRef = {
  secretRef: {
    name: string;
  };
};

export type ConfigMapRef = {
  configMapRef: {
    name: string;
  };
};

export type EnvironmentFromVariable = Partial<SecretRef> & Partial<ConfigMapRef>;

export type NotebookPort = {
  name: string;
  containerPort: number;
  protocol: string;
};

export type NotebookSize = {
  name: string;
  resources: ContainerResources;
  notUserDefined?: boolean;
};

export type ModelServingSize = {
  name: string;
  resources: ContainerResources;
};

export type HardwareProfileAnnotations = Partial<{
  'opendatahub.io/display-name': string;
  'opendatahub.io/description': string;
  'opendatahub.io/dashboard-feature-visibility': string;
  'opendatahub.io/disabled': string;
}>;

export type HardwareProfileBindingAnnotations = {
  'opendatahub.io/hardware-profile-name': string;
  'opendatahub.io/hardware-profile-namespace': string | null;
  'opendatahub.io/hardware-profile-resource-version': string;
};

export enum SchedulingType {
  QUEUE = 'Queue',
  NODE = 'Node',
}

export enum TolerationOperator {
  EXISTS = 'Exists',
  EQUAL = 'Equal',
}

export enum TolerationEffect {
  NO_SCHEDULE = 'NoSchedule',
  PREFER_NO_SCHEDULE = 'PreferNoSchedule',
  NO_EXECUTE = 'NoExecute',
}

export type Toleration = {
  key: string;
  operator?: TolerationOperator;
  value?: string;
  effect?: TolerationEffect;
  tolerationSeconds?: number;
};

export type NodeSelector = Record<string, string>;

export type HardwareProfileScheduling = {
  type: SchedulingType;
  kueue?: {
    localQueueName: string;
    priorityClass?: string;
  };
  node?: {
    nodeSelector?: NodeSelector;
    tolerations?: Toleration[];
  };
};

export enum IdentifierResourceType {
  CPU = 'CPU',
  MEMORY = 'Memory',
  ACCELERATOR = 'Accelerator',
}

export type Identifier = {
  displayName: string;
  identifier: string;
  minCount: number | string;
  maxCount?: number | string;
  defaultCount: number | string;
  resourceType?: IdentifierResourceType;
};

export type PodContainer = {
  name: string;
  image: string;
  imagePullPolicy?: string;
  workingDir?: string;
  env: EnvironmentVariable[];
  envFrom?: EnvironmentFromVariable[];
  ports?: NotebookPort[];
  resources?: ContainerResources;
  livenessProbe?: Record<string, unknown>;
  readinessProbe?: Record<string, unknown>;
  volumeMounts?: VolumeMount[];
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;
  securityContext?: unknown;
};

export type PodAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type Volume = {
  name: string;
  emptyDir?: Record<string, unknown>;
  persistentVolumeClaim?: {
    claimName: string;
  };
  secret?: {
    secretName: string;
    optional?: boolean;
    defaultMode?: number;
  };
  configMap?: {
    name: string;
    optional?: boolean;
    defaultMode?: number;
  };
};

export type VolumeMount = { mountPath: string; name: string; subPath?: string };

export enum AccessMode {
  RWO = 'ReadWriteOnce',
  RWX = 'ReadWriteMany',
  ROX = 'ReadOnlyMany',
  RWOP = 'ReadWriteOncePod',
}
