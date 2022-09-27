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

export type ConfigMapKind = K8sResourceCommon & {
  data?: Record<string, string>;
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
  status?: Record<string, unknown>;
};

export type NotebookKind = K8sResourceCommon & {
  metadata: {
    annotations: Partial<{
      'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running)
      'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
      'opendatahub.io/link': string; // redirect notebook url
      'opendatahub.io/username': string; // the untranslated username behind the notebook
      'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
      'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
    }>;
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
    labels?: Partial<{
      'opendatahub.io/user': string; // translated username -- see translateUsername
    }>;
    name: string;
  };
};

type RoleBindingSubject = {
  kind: string;
  apiGroup: string;
  name: string;
};

export type RoleBindingKind = K8sResourceCommon & {
  subjects: RoleBindingSubject[];
  roleRef: RoleBindingSubject;
};

export type RouteKind = K8sResourceCommon & {
  spec: {
    host: string;
  };
};

export type SecretKind = K8sResourceCommon & {
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
};
