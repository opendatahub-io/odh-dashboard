import type {
  K8sResourceCommon,
  ContainerResources,
  DisplayNameAnnotations,
  NodeSelector,
  PodAffinity,
  SupportedModelFormats,
  Toleration,
  Volume,
  VolumeMount,
  ImagePullSecret,
} from '@odh-dashboard/k8s-core';

export enum ModelDeploymentState {
  PENDING = 'Pending',
  STANDBY = 'Standby',
  FAILED_TO_LOAD = 'FailedToLoad',
  LOADING = 'Loading',
  LOADED = 'Loaded',
  UNKNOWN = 'Unknown',
}

export type ModelStatus = {
  failedToSchedule: boolean;
  failureMessage?: string | null;
};

export type SupportedModelFormatsInfo = {
  name: string;
  version: string;
  autoSelect?: boolean;
  priority?: number;
};

export type ServingRuntimeToken = {
  uuid: string;
  name: string;
  error: string;
  editName?: string;
};

export type CreatingModelServingObjectCommon = {
  name: string;
  k8sName: string;
  externalRoute: boolean;
  tokenAuth: boolean;
  tokens: ServingRuntimeToken[];
};

export type CreatingServingRuntimeObject = CreatingModelServingObjectCommon & {
  servingRuntimeTemplateName: string;
  numReplicas: number;
  imageName?: string;
  supportedModelFormatsInfo?: SupportedModelFormatsInfo;
  scope?: string;
};

export type ModelDeployPrefillInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  connectionTypeName?: string;
  initialConnectionName?: string;
  modelRegistryInfo?: {
    modelVersionId?: string;
    registeredModelId?: string;
    mrName?: string;
  };
};

export type ServingRuntimeAnnotations = Partial<{
  'opendatahub.io/template-name': string;
  'opendatahub.io/template-display-name': string;
  'opendatahub.io/disable-gpu': string;
  'opendatahub.io/recommended-accelerators': string;
  'opendatahub.io/accelerator-name': string;
  'opendatahub.io/apiProtocol': string;
  'opendatahub.io/serving-runtime-scope': string;
  'opendatahub.io/accelerator-profile-namespace': string | undefined;
  'enable-route': string;
  'enable-auth': string;
}>;

export type ServingContainer = {
  name: string;
  args?: string[];
  image?: string;
  affinity?: PodAffinity;
  resources?: ContainerResources;
  volumeMounts?: VolumeMount[];
  env?: {
    name: string;
    value?: string;
    valueFrom?: {
      secretKeyRef?: {
        name: string;
        key: string;
      };
    };
  }[];
};

export type ServingRuntimeKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations & ServingRuntimeAnnotations;
    name: string;
    namespace: string;
  };
  spec: {
    builtInAdapter?: {
      serverType?: string;
      runtimeManagementPort?: number;
      memBufferBytes?: number;
      modelLoadingTimeoutMillis?: number;
    };
    containers: ServingContainer[];
    supportedModelFormats?: SupportedModelFormats[];
    replicas?: number;
    tolerations?: Toleration[];
    nodeSelector?: NodeSelector;
    volumes?: Volume[];
    imagePullSecrets?: ImagePullSecret[];
  };
};

export enum DeploymentMode {
  RawDeployment = 'RawDeployment',
}

export type InferenceServiceAnnotations = DisplayNameAnnotations &
  Partial<{
    'security.opendatahub.io/enable-auth': string;
    'security.opendatahub.io/auth-proxy-type': 'kube-rbac-proxy' | 'oauth-proxy' | string;
    'serving.kserve.io/deploymentMode': DeploymentMode;
    'serving.knative.openshift.io/enablePassthrough': 'true';
    'sidecar.istio.io/inject': 'true';
    'sidecar.istio.io/rewriteAppHTTPProbers': 'true';
    'opendatahub.io/hardware-profile-name': string;
    'opendatahub.io/hardware-profile-namespace': string;
    'opendatahub.io/hardware-profile-resource-version': string;
  }>;

export type InferenceServiceLabels = Partial<{
  'networking.knative.dev/visibility': string;
  'networking.kserve.io/visibility': 'exposed';
}>;

export type InferenceServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: InferenceServiceAnnotations;
    labels?: InferenceServiceLabels;
  };
  spec: {
    predictor: {
      annotations?: Record<string, string>;
      tolerations?: Toleration[];
      nodeSelector?: NodeSelector;
      timeout?: number;
      deploymentStrategy?: {
        type: 'RollingUpdate' | 'Recreate';
      };
      model?: {
        modelFormat?: {
          name: string;
          version?: string;
        };
        resources?: ContainerResources;
        runtime?: string;
        storageUri?: string;
        storage?: {
          key?: string;
          parameters?: Record<string, string>;
          path?: string;
          schemaPath?: string;
        };
        args?: ServingContainer['args'];
        env?: ServingContainer['env'];
      };
      maxReplicas?: number;
      minReplicas?: number;
      imagePullSecrets?: ImagePullSecret[];
    };
  };
  status?: {
    components?: {
      predictor?: {
        grpcUrl?: string;
        restUrl?: string;
        url?: string;
      };
    };
    conditions?: {
      lastTransitionTime?: string;
      status: string;
      type: string;
    }[];
    modelStatus?: {
      copies?: {
        failedCopies?: number;
        totalCopies?: number;
      };
      lastFailureInfo?: {
        location?: string;
        message?: string;
        modelRevisionName?: string;
        reason?: string;
        time?: string;
      };
      states?: {
        activeModelState: string;
        targetModelState?: string;
      };
      transitionStatus: string;
    };
    url: string;
    address?: {
      CACerts?: string;
      audience?: string;
      name?: string;
      url?: string;
    };
  };
};

export const isInferenceServiceKind = (obj: K8sResourceCommon): obj is InferenceServiceKind =>
  obj.kind === 'InferenceService';

export enum ServingRuntimePlatform {
  SINGLE = 'single',
}

export enum ServingRuntimeAPIProtocol {
  REST = 'REST',
  GRPC = 'gRPC',
}

export enum ServingRuntimeModelType {
  PREDICTIVE = 'predictive',
  GENERATIVE = 'generative',
}
