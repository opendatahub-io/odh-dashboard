import {
  ContainerResources,
  NodeSelector,
  PodAffinity,
  TolerationEffect,
  TolerationOperator,
  Volume,
  VolumeMount,
} from '@odh-dashboard/internal/types.js';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export type ModelVersionRegisteredDeploymentsViewProps = {
  inferenceServices: FetchStateObject<InferenceServiceKind[]>;
  servingRuntimes: FetchStateObject<ServingRuntimeKind[]>;
  refresh: () => void;
};

export type FetchStateObject<T, E = Error> = {
  data: T;
  loaded: boolean;
  error?: E;
  refresh: () => void;
};

export declare enum ServingDeploymentMode {
  ModelMesh = 'ModelMesh',
  RawDeployment = 'RawDeployment',
  Serverless = 'Serverless',
}
export type InferenceServiceAnnotations = Partial<{
  'security.kubeflow.io/enable-auth': string;
}>;
export type InferenceServiceLabels = Partial<{
  'networking.knative.dev/visibility': string;
  'networking.kserve.io/visibility': 'exposed';
}>;
export type ImagePullSecret = {
  name: string;
};
export type InferenceServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: InferenceServiceAnnotations &
      Partial<{
        'serving.kserve.io/deploymentMode': ServingDeploymentMode;
        'sidecar.istio.io/inject': 'true';
        'sidecar.istio.io/rewriteAppHTTPProbers': 'true';
      }>;
    labels?: InferenceServiceLabels;
  };
  spec: {
    predictor: {
      tolerations?: Toleration[];
      nodeSelector?: NodeSelector;
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
export type Toleration = {
  key: string;
  operator?: TolerationOperator;
  value?: string;
  effect?: TolerationEffect;
  tolerationSeconds?: number;
};
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
export type ServingRuntimeAnnotations = Partial<{
  'enable-route': string;
  'enable-auth': string;
  'modelmesh-enabled': 'true' | 'false';
}>;
export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};
export type ServingRuntimeKind = K8sResourceCommon & {
  metadata: {
    annotations?: ServingRuntimeAnnotations;
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
//# sourceMappingURL=k8sTypes.d.ts.map
