import React, { useState } from 'react';
import { FormGroup, Radio, Alert, MenuItem, MenuGroup, Tooltip } from '@patternfly/react-core';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { RecursivePartial } from '~/typeHelpers';
import { ConfigSecretItem } from '~/k8sTypes';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { PemFileUpload } from './PemFileUpload';

export enum SecureDBRType {
  CLUSTER_WIDE = 'cluster-wide',
  OPENSHIFT = 'openshift',
  EXISTING = 'existing',
  NEW = 'new',
}

export interface SecureDBInfo {
  type: SecureDBRType;
  configMap: string;
  key: string;
  certificate: string;
  nameSpace: string;
  isValid: boolean;
}

interface CreateMRSecureDBSectionProps {
  secureDBInfo: SecureDBInfo;
  modelRegistryNamespace: string;
  nameDesc: { name: string };
  existingCertConfigMaps: ConfigSecretItem[];
  existingCertSecrets: ConfigSecretItem[];
  setSecureDBInfo: (info: SecureDBInfo) => void;
}

export const CreateMRSecureDBSection: React.FC<CreateMRSecureDBSectionProps> = ({
  secureDBInfo,
  modelRegistryNamespace,
  nameDesc,
  existingCertConfigMaps,
  existingCertSecrets,
  setSecureDBInfo,
}) => {
  const [configSecretName, setConfigSecretName] = useState('');
  const [key, setKey] = useState('');
  const [existingCertKeys, setExistingCertKeys] = useState<string[]>([]);
  const ODH_TRUSTED_BUNDLE = 'odh-trusted-ca-bundle';
  const CA_BUNDLE_CRT = 'ca-bundle.crt';
  const ODH_CA_BUNDLE_CRT = 'odh-ca-bundle.crt';

  const hasContent = (value: string): boolean => !!value.trim().length;

  const isValid = (info?: RecursivePartial<SecureDBInfo>) => {
    const fullInfo: SecureDBInfo = { ...secureDBInfo, ...info };
    if ([SecureDBRType.CLUSTER_WIDE, SecureDBRType.OPENSHIFT].includes(fullInfo.type)) {
      return true;
    }
    if (fullInfo.type === SecureDBRType.EXISTING) {
      return hasContent(fullInfo.configMap) && hasContent(fullInfo.key);
    }
    if (fullInfo.type === SecureDBRType.NEW) {
      return hasContent(fullInfo.certificate);
    }
    return false;
  };

  const clusterWideCABundle = existingCertConfigMaps.find(
    (configMap) => configMap.name === ODH_TRUSTED_BUNDLE && configMap.keys.includes(CA_BUNDLE_CRT),
  );

  const isClusterWideCABundleAvailable = !!clusterWideCABundle;

  const openshiftCAbundle = existingCertConfigMaps.find(
    (configMap) =>
      configMap.name === ODH_TRUSTED_BUNDLE && configMap.keys.includes(ODH_CA_BUNDLE_CRT),
  );

  const isProductCABundleAvailable = !!openshiftCAbundle;

  const getKeysByName = (
    configMaps: ConfigSecretItem[],
    secrets: ConfigSecretItem[],
    targetName: string,
  ): string[] => {
    let keys: string[] = [];
    // Search in ConfigMaps first
    const configMap = configMaps.find((item) => item.name === targetName);
    if (configMap) {
      keys = configMap.keys;
    }

    // If not found, search in Secrets
    const secret = secrets.find((item) => item.name === targetName);
    if (secret) {
      keys = secret.keys;
    }
    return keys;
  };

  const handleSecureDBTypeChange = (type: SecureDBRType) => {
    const newInfo = {
      type,
      nameSpace: '',
      key: '',
      configMap: '',
      certificate: '',
    };
    setSecureDBInfo({
      ...newInfo,
      isValid: isValid(newInfo),
    });
  };

  const handleResourceSelect = (selectedName: string) => {
    setConfigSecretName('');
    const newKeys = getKeysByName(existingCertConfigMaps, existingCertSecrets, selectedName);
    setExistingCertKeys(newKeys); // Update keys for the second dropdown for existing certificate field

    const newInfo = {
      ...secureDBInfo,
      configMap: selectedName,
      key: '',
    };

    setSecureDBInfo({ ...newInfo, isValid: isValid(newInfo) });
  };

  const getFilteredExistingCAResources = () => (
    <>
      <MenuGroup label="ConfigMaps">
        {existingCertConfigMaps
          .filter((configMap) =>
            configMap.name.toLowerCase().includes(configSecretName.toLowerCase()),
          )
          .map((configMap, index) => (
            <MenuItem
              key={`configmap-${index}`}
              onClick={() => handleResourceSelect(configMap.name)}
            >
              {configMap.name}
            </MenuItem>
          ))}
      </MenuGroup>
      <MenuGroup label="Secrets">
        {existingCertSecrets
          .filter((secret) => secret.name.toLowerCase().includes(configSecretName.toLowerCase()))
          .map((secret, index) => (
            <MenuItem key={`secret-${index}`} onClick={() => handleResourceSelect(secret.name)}>
              {secret.name}
            </MenuItem>
          ))}
      </MenuGroup>
    </>
  );

  return (
    <>
      {!isClusterWideCABundleAvailable ? (
        <Tooltip content="No certificate is available in the cluster-wide CA bundle">
          <Radio
            isChecked={secureDBInfo.type === SecureDBRType.CLUSTER_WIDE}
            name="cluster-wide-ca"
            isDisabled={!isClusterWideCABundleAvailable}
            onChange={() => handleSecureDBTypeChange(SecureDBRType.CLUSTER_WIDE)}
            label="Use cluster-wide CA bundle"
            description={
              <>
                Use the <strong>{CA_BUNDLE_CRT}</strong> bundle in the{' '}
                <strong>{ODH_TRUSTED_BUNDLE}</strong> ConfigMap.
              </>
            }
            id="cluster-wide-ca"
          />
        </Tooltip>
      ) : (
        <Radio
          isChecked={secureDBInfo.type === SecureDBRType.CLUSTER_WIDE}
          name="cluster-wide-ca"
          isDisabled={!isClusterWideCABundleAvailable}
          onChange={() => handleSecureDBTypeChange(SecureDBRType.CLUSTER_WIDE)}
          label="Use cluster-wide CA bundle"
          description={
            <>
              Use the <strong>{CA_BUNDLE_CRT}</strong> bundle in the{' '}
              <strong>{ODH_TRUSTED_BUNDLE}</strong> ConfigMap.
            </>
          }
          id="cluster-wide-ca"
        />
      )}
      {!isProductCABundleAvailable ? (
        <Tooltip content={`No certificate is available in the ${ODH_PRODUCT_NAME} CA bundle`}>
          <Radio
            isChecked={secureDBInfo.type === SecureDBRType.OPENSHIFT}
            name="openshift-ca"
            isDisabled={!isProductCABundleAvailable}
            onChange={() => handleSecureDBTypeChange(SecureDBRType.OPENSHIFT)}
            label={`Use ${ODH_PRODUCT_NAME} CA bundle`}
            description={
              <>
                Use the <strong>{ODH_CA_BUNDLE_CRT}</strong> bundle in the{' '}
                <strong>{ODH_TRUSTED_BUNDLE}</strong> ConfigMap.
              </>
            }
            id="openshift-ca"
          />
        </Tooltip>
      ) : (
        <Radio
          isChecked={secureDBInfo.type === SecureDBRType.OPENSHIFT}
          name="openshift-ca"
          isDisabled={!isProductCABundleAvailable}
          onChange={() => handleSecureDBTypeChange(SecureDBRType.OPENSHIFT)}
          label={`Use ${ODH_PRODUCT_NAME} CA bundle`}
          description={
            <>
              Use the <strong>{ODH_CA_BUNDLE_CRT}</strong> bundle in the{' '}
              <strong>{ODH_TRUSTED_BUNDLE}</strong> ConfigMap.
            </>
          }
          id="openshift-ca"
        />
      )}
      <Radio
        isChecked={secureDBInfo.type === SecureDBRType.EXISTING}
        name="existing-ca"
        onChange={() => handleSecureDBTypeChange(SecureDBRType.EXISTING)}
        label="Choose from existing certificates"
        description={
          <>
            You can select the key of any ConfigMap or Secret in the{' '}
            <strong>{modelRegistryNamespace}</strong> namespace.
          </>
        }
        id="existing-ca"
      />
      {secureDBInfo.type === SecureDBRType.EXISTING && (
        <>
          <FormGroup
            label="Resource"
            isRequired
            fieldId="existing-ca-resource"
            style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}
          >
            <SearchSelector
              isFullWidth
              dataTestId="existing-ca-resource-selector"
              onSearchChange={(newValue) => setConfigSecretName(newValue)}
              onSearchClear={() => setConfigSecretName('')}
              searchValue={configSecretName}
              toggleText={secureDBInfo.configMap || 'Select a ConfigMap or a Secret'}
            >
              {getFilteredExistingCAResources()}
            </SearchSelector>
          </FormGroup>
          <FormGroup
            label="Key"
            isRequired
            fieldId="existing-ca-key"
            style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}
          >
            <SearchSelector
              isFullWidth
              dataTestId="existing-ca-key-selector"
              onSearchChange={(newValue) => setKey(newValue)}
              isDisabled={!secureDBInfo.configMap}
              onSearchClear={() => setKey('')}
              searchValue={key}
              toggleText={
                secureDBInfo.key ||
                (!secureDBInfo.configMap
                  ? 'Select a resource to view its available keys'
                  : 'Select a key')
              }
            >
              {existingCertKeys
                .filter((item) => item.toLowerCase().includes(key.toLowerCase()))
                .map((item, index) => (
                  <MenuItem
                    key={`key-${index}`}
                    onClick={() => {
                      setKey('');
                      const newInfo = {
                        ...secureDBInfo,
                        key: item,
                      };
                      setSecureDBInfo({ ...newInfo, isValid: isValid(newInfo) });
                    }}
                  >
                    {item}
                  </MenuItem>
                ))}
            </SearchSelector>
          </FormGroup>
        </>
      )}
      <Radio
        isChecked={secureDBInfo.type === SecureDBRType.NEW}
        name="new-ca"
        onChange={() => handleSecureDBTypeChange(SecureDBRType.NEW)}
        label="Upload new certificate"
        id="new-ca"
      />
      {secureDBInfo.type === SecureDBRType.NEW && (
        <>
          <Alert
            isInline
            title="Note"
            variant="info"
            style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}
          >
            Uploading a certificate below creates the{' '}
            <strong>{translateDisplayNameForK8s(nameDesc.name)}-db-credential</strong> ConfigMap
            with the <strong>ca.crt</strong> key. If you&apos;d like to upload the certificate as a
            Secret instead, see the documentation for more details.
          </Alert>
          <FormGroup
            label="Certificate"
            required
            style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}
          >
            <PemFileUpload
              onChange={(value) => {
                const newInfo = {
                  ...secureDBInfo,
                  certificate: value,
                };
                setSecureDBInfo({ ...newInfo, isValid: isValid(newInfo) });
              }}
            />
          </FormGroup>
        </>
      )}
    </>
  );
};
