import { RecursivePartial } from '~/typeHelpers';
import { ModelRegistryKind } from '~/k8sTypes';
import {
  CA_BUNDLE_CRT,
  ODH_CA_BUNDLE_CRT,
  ODH_TRUSTED_BUNDLE,
  ResourceType,
  SecureDBRType,
} from './const';
import { SecureDBInfo } from './CreateMRSecureDBSection';

export const findSecureDBType = (name: string, key: string): SecureDBRType => {
  if (name === ODH_TRUSTED_BUNDLE && key === CA_BUNDLE_CRT) {
    return SecureDBRType.CLUSTER_WIDE;
  }
  if (name === ODH_TRUSTED_BUNDLE && key === ODH_CA_BUNDLE_CRT) {
    return SecureDBRType.OPENSHIFT;
  }
  return SecureDBRType.EXISTING;
};

export const findConfigMap = (secureDBInfo: SecureDBInfo): { name: string; key: string } => {
  if (secureDBInfo.type === SecureDBRType.CLUSTER_WIDE) {
    return { name: ODH_TRUSTED_BUNDLE, key: CA_BUNDLE_CRT };
  }
  if (secureDBInfo.type === SecureDBRType.OPENSHIFT) {
    return { name: ODH_TRUSTED_BUNDLE, key: ODH_CA_BUNDLE_CRT };
  }
  return { name: secureDBInfo.resourceName, key: secureDBInfo.key };
};

export const constructRequestBody = (
  data: RecursivePartial<ModelRegistryKind>,
  secureDBInfo: SecureDBInfo,
  addSecureDB: boolean,
): RecursivePartial<ModelRegistryKind> => {
  const mr = data;
  if (addSecureDB && secureDBInfo.resourceType === ResourceType.Secret && mr.spec?.mysql) {
    mr.spec.mysql.sslRootCertificateSecret = {
      name: secureDBInfo.resourceName,
      key: secureDBInfo.key,
    };
    mr.spec.mysql.sslRootCertificateConfigMap = null;
  } else if (addSecureDB && mr.spec?.mysql) {
    mr.spec.mysql.sslRootCertificateConfigMap = findConfigMap(secureDBInfo);
    mr.spec.mysql.sslRootCertificateSecret = null;
  } else if (!addSecureDB && mr.spec?.mysql) {
    mr.spec.mysql.sslRootCertificateConfigMap = null;
    mr.spec.mysql.sslRootCertificateSecret = null;
  }

  return mr;
};
