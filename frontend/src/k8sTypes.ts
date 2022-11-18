import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookAffinity, NotebookContainer, NotebookToleration, Volume } from './types';

/**
 * Annotations that we will use to allow the user flexibility in describing items outside of the
 * k8s structure.
 */
type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string; // the description provided by the user
  'openshift.io/display-name': string; // the name provided by the user
}>;

export type K8sDSGResource = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    name: string;
  };
};

type ImageStreamAnnotations = Partial<{
  'opendatahub.io/notebook-image-desc': string;
  'opendatahub.io/notebook-image-name': string;
  'opendatahub.io/notebook-image-url': string;
  'opendatahub.io/notebook-image-order': string;
}>;

type ImageStreamSpecTagAnnotations = Partial<{
  'opendatahub.io/notebook-python-dependencies': string;
  'opendatahub.io/notebook-software': string;
  'opendatahub.io/notebook-image-recommended': string;
  'opendatahub.io/default-image': string;
}>;

export type NotebookAnnotations = Partial<{
  'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running),  `odh-notebook-controller-lock` is set when first creating the notebook to avoid race conditions, it's a fake stop
  'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
  'opendatahub.io/link': string; // redirect notebook url
  'opendatahub.io/username': string; // the untranslated username behind the notebook
  'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
  'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
}>;

export type BuildConfigKind = K8sResourceCommon & {
  metadata: {
    name: string;
    labels?: Partial<{
      'opendatahub.io/notebook-name': string;
    }>;
  };
  spec: {
    output: {
      to: {
        name: string;
      };
    };
  };
};

export type BuildKind = K8sResourceCommon & {
  metadata: {
    name: string;
    annotations?: Partial<{
      'openshift.io/build.number': string;
    }>;
    labels?: Partial<{
      buildconfig: string;
      'openshift.io/build-config.name': string;
    }>;
  };
  spec: {
    output: {
      to: {
        name: string;
      };
    };
  };
  status: {
    phase: BUILD_PHASE;
    completionTimestamp?: string;
    startTimestamp?: string;
  };
};

/**
 * Contains all the phases for BuildKind -> status -> phase (excluding NONE phase)
 */
export enum BUILD_PHASE {
  NONE = 'Not started',
  NEW = 'New',
  RUNNING = 'Running',
  PENDING = 'Pending',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
  ERROR = 'Error',
  CANCELLED = 'Cancelled',
}

export type ConfigMapKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  data?: Record<string, string>;
};

export type EventKind = K8sResourceCommon & {
  metadata: {
    uid?: string;
  };
  involvedObject: {
    name: string;
  };
  lastTimestamp?: string;
  eventTime: string;
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
};

export type ImageStreamKind = K8sResourceCommon & {
  metadata: {
    annotations?: ImageStreamAnnotations;
    name: string;
  };
  spec: {
    tags?: ImageStreamSpecTagType[];
  };
  status?: {
    dockerImageRepository?: string;
    publicDockerImageRepository?: string;
    tags?: {
      tag: string;
    }[];
  };
};

export type ImageStreamSpecTagType = {
  name: string;
  annotations?: ImageStreamSpecTagAnnotations;
  from: {
    kind: string;
    name: string;
  };
};

/** A status object when Kube backend can't handle a request. */
export type K8sStatus = {
  kind: string;
  apiVersion: string;
  code: number;
  message: string;
  reason: string;
  status: string;
};

export type PersistentVolumeClaimKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    name: string;
    namespace: string;
  };
  spec: {
    accessModes: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    storageClassName?: string;
    volumeMode: 'Filesystem' | 'Block';
  };
  status?: {
    phase: string;
    capacity?: {
      storage: string;
    };
  } & Record<string, unknown>;
};

export type NotebookKind = K8sResourceCommon & {
  metadata: {
    annotations: DisplayNameAnnotations & NotebookAnnotations;
    name: string;
    namespace: string;
    labels: Partial<{
      'opendatahub.io/user': string; // translated username -- see translateUsername
    }>;
  };
  spec: {
    template: {
      spec: {
        affinity?: NotebookAffinity;
        enableServiceLinks?: boolean;
        containers: NotebookContainer[];
        volumes?: Volume[];
        tolerations?: NotebookToleration[];
      };
    };
  };
  status?: {
    containerState?: {
      terminated?: { [key: string]: string };
    };
  };
};

export type PodKind = K8sResourceCommon & {
  status: {
    containerStatuses: { ready: boolean; state?: { running?: boolean } }[];
  };
};

export type ProjectKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'openshift.io/requester': string; // the username of the user that requested this project
      }>;
    name: string;
  };
  status?: {
    phase: 'Active' | 'Terminating';
  };
};

export type ServiceAccountKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    name: string;
    namespace: string;
  };
  secrets?: {
    name: string;
  }[];
};

export type ServingRuntimeKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        ['enable-route']: string;
        ['enable-auth']: string;
      }>;
    name: string;
    namespace: string;
  };
  spec: {
    builtInAdapter: {
      serverType: string;
      runtimeManagementPort: number;
    };
    containers: {
      args: string[];
      image: string;
      name: string;
      resources: {
        limits: {
          cpu: string;
          memory: string;
        };
        requests: {
          cpu: string;
          memory: string;
        };
      };
    }[];
    supportedModelFormats: SupportedModelFormats[];
    replicas: number;
  };
};

export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};

export type InferenceServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    predictor: {
      model: {
        modelFormat: {
          name: string;
          version?: string;
        };
        runtime?: string;
        storageUri?: string;
        storage?: {
          key: string;
          parameters?: Record<string, string>;
          path: string;
          schemaPath?: string;
        };
      };
    };
  };
  status?: {
    components: {
      predictor: {
        grpcUrl: string;
        restUrl: string;
        url: string;
      };
    };
    conditions: {
      lastTransitionTime: string;
      status: string;
      type: string;
    }[];
    modelStatus: {
      copies: {
        failedCopies: number;
        totalCopies: number;
      };
      states: {
        activeModelState: string;
        targetModelState: string;
      };
      transitionStatus: string;
    };
    url: string;
  };
};

type RoleBindingSubject = {
  kind: string;
  apiGroup?: string;
  name: string;
};

export type RoleBindingKind = K8sResourceCommon & {
  subjects: RoleBindingSubject[];
  roleRef: RoleBindingSubject;
};

export type RouteKind = K8sResourceCommon & {
  spec: {
    host: string;
    path: string;
  };
};

export type SecretKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
};

export type AWSSecretKind = SecretKind & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    labels?: {
      'opendatahub.io/managed': 'true';
    };
  };
};
