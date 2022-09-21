import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

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
