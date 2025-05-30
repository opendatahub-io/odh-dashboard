import React, { useState } from 'react';
import { FormGroup, Radio, Alert, MenuItem, MenuGroup, Tooltip } from '@patternfly/react-core';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import { RecursivePartial } from '#~/typeHelpers';
import { ConfigSecretItem } from '#~/k8sTypes';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { PemFileUpload } from './PemFileUpload';
import {
  CA_BUNDLE_CRT,
  ODH_CA_BUNDLE_CRT,
  ODH_TRUSTED_BUNDLE,
  ResourceType,
  SecureDBRType,
} from './const';
import { isClusterWideCABundleEnabled, isOpenshiftCAbundleEnabled } from './utils';

export interface SecureDBInfo {
  type: SecureDBRType;
  resourceName: string;
  key: string;
  certificate: string;
  nameSpace: string;
  isValid: boolean;
  resourceType?: ResourceType;
}

interface CreateMRSecureDBSectionProps {
  secureDBInfo: SecureDBInfo;
  modelRegistryNamespace: string;
  k8sName: string;
  existingCertConfigMaps: ConfigSecretItem[];
  existingCertSecrets: ConfigSecretItem[];
  setSecureDBInfo: (info: SecureDBInfo) => void;
}

export const CreateMRSecureDBSection: React.FC<CreateMRSecureDBSectionProps> = ({
  secureDBInfo,
  modelRegistryNamespace,
  k8sName,
  existingCertConfigMaps,
  existingCertSecrets,
  setSecureDBInfo,
}) => {
  const [searchConfigSecretName, setSearchConfigSecretName] = useState('');
  const [searchKey, setSearchKey] = useState('');

  let newConfigMapName = 'db-credential';
  if (k8sName) {
    newConfigMapName = `${k8sName}-db-credential`;
    let suffix = 1;
    const existingConfigMaps = existingCertConfigMaps.map((cofigmap) => cofigmap.name);

    while (existingConfigMaps.includes(newConfigMapName)) {
      suffix++;
      newConfigMapName = `${k8sName}-db-credential-${suffix}`;
    }
  }

  const hasContent = (value: string): boolean => !!value.trim().length;

  const isValid = (info?: RecursivePartial<SecureDBInfo>) => {
    const fullInfo: SecureDBInfo = { ...secureDBInfo, ...info };
    if ([SecureDBRType.CLUSTER_WIDE, SecureDBRType.OPENSHIFT].includes(fullInfo.type)) {
      return true;
    }
    if (fullInfo.type === SecureDBRType.EXISTING) {
      return hasContent(fullInfo.resourceName) && hasContent(fullInfo.key);
    }
    if (fullInfo.type === SecureDBRType.NEW) {
      return hasContent(fullInfo.certificate);
    }
    return false;
  };

  const isClusterWideCABundleAvailable = isClusterWideCABundleEnabled(existingCertConfigMaps);
  const isProductCABundleAvailable = isOpenshiftCAbundleEnabled(existingCertConfigMaps);

  const getKeysByName = (configMapsSecrets: ConfigSecretItem[], targetName: string): string[] => {
    const configMapSecret = configMapsSecrets.find(
      (configMapOrSecret) => configMapOrSecret.name === targetName,
    );
    return configMapSecret ? configMapSecret.keys : [];
  };

  const handleSecureDBTypeChange = (type: SecureDBRType) => {
    const newInfo = {
      type,
      nameSpace: '',
      key: '',
      resourceName: '',
      resourceType: undefined,
      certificate: '',
    };
    setSecureDBInfo({
      ...newInfo,
      isValid: isValid(newInfo),
    });
  };

  const handleResourceSelect = (selectedName: string, resourceType: ResourceType) => {
    setSearchConfigSecretName('');

    const newInfo = {
      ...secureDBInfo,
      resourceName: selectedName,
      key: '',
      resourceType,
    };

    setSecureDBInfo({ ...newInfo, isValid: isValid(newInfo) });
  };

  const getFilteredExistingCAResources = () => {
    const filteredConfigMaps = existingCertConfigMaps.filter((configMap) =>
      configMap.name.toLowerCase().includes(searchConfigSecretName.toLowerCase()),
    );
    const filteredSecrets = existingCertSecrets.filter((secret) =>
      secret.name.toLowerCase().includes(searchConfigSecretName.toLowerCase()),
    );

    if (filteredConfigMaps.length === 0 && filteredSecrets.length === 0) {
      return <MenuItem isDisabled>No results found</MenuItem>;
    }

    return (
      <>
        {filteredConfigMaps.length > 0 && (
          <MenuGroup label="ConfigMaps">
            {filteredConfigMaps.map((configMap, index) => (
              <MenuItem
                key={`configmap-${index}`}
                onClick={() => handleResourceSelect(configMap.name, ResourceType.ConfigMap)}
              >
                {configMap.name}
              </MenuItem>
            ))}
          </MenuGroup>
        )}
        {filteredSecrets.length > 0 && (
          <MenuGroup label="Secrets">
            {filteredSecrets.map((secret, index) => (
              <MenuItem
                key={`secret-${index}`}
                onClick={() => handleResourceSelect(secret.name, ResourceType.Secret)}
              >
                {secret.name}
              </MenuItem>
            ))}
          </MenuGroup>
        )}
      </>
    );
  };

  return (
    <>
      {!isClusterWideCABundleAvailable ? (
        <Tooltip content="No certificate is available in the cluster-wide CA bundle">
          <Radio
            isChecked={secureDBInfo.type === SecureDBRType.CLUSTER_WIDE}
            name="cluster-wide-ca"
            data-testid="cluster-wide-ca-radio"
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
          data-testid="cluster-wide-ca-radio"
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
            data-testid="openshift-ca-radio"
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
          data-testid="openshift-ca-radio"
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
        data-testid="existing-ca-radio"
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
              onSearchChange={(newValue) => setSearchConfigSecretName(newValue)}
              onSearchClear={() => setSearchConfigSecretName('')}
              searchValue={searchConfigSecretName}
              toggleContent={secureDBInfo.resourceName || 'Select a ConfigMap or a Secret'}
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
              onSearchChange={(newValue) => setSearchKey(newValue)}
              isDisabled={!secureDBInfo.resourceName}
              onSearchClear={() => setSearchKey('')}
              searchValue={searchKey}
              toggleContent={
                secureDBInfo.key ||
                (!secureDBInfo.resourceName
                  ? 'Select a resource to view its available keys'
                  : 'Select a key')
              }
            >
              {getKeysByName(
                secureDBInfo.resourceType === 'ConfigMap'
                  ? existingCertConfigMaps
                  : existingCertSecrets,
                secureDBInfo.resourceName,
              )
                .filter((item) => item.toLowerCase().includes(searchKey.toLowerCase()))
                .map((item, index) => (
                  <MenuItem
                    key={`key-${index}`}
                    onClick={() => {
                      setSearchKey('');
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
        data-testid="new-certificate-ca-radio"
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
            data-testid="certificate-note"
            style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}
          >
            Uploading a certificate below creates the <strong>{newConfigMapName}</strong> ConfigMap
            with the <strong>ca.crt</strong> key. If you&apos;d like to upload the certificate as a
            Secret instead, see the documentation for more details.
          </Alert>
          <FormGroup
            label="Certificate"
            data-testid="certificate-upload"
            required
            style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}
          >
            <PemFileUpload
              onChange={(value) => {
                const newInfo = {
                  ...secureDBInfo,
                  resourceName: newConfigMapName,
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
