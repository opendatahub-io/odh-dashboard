import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

/**
 * Annotations that we will use to allow the user flexibility in describing items outside of the
 * k8s structure.
 */
type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string; // the description provided by the user
  'openshift.io/display-name': string; // the name provided by the user
}>;

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

export type SecretKind = K8sResourceCommon & {
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
};
