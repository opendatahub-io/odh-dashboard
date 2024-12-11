import React, { useState } from 'react';
import { FormGroup, Radio, Alert, MenuItem, MenuGroup } from '@patternfly/react-core';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { RecursivePartial } from '~/typeHelpers';
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
  existingCertKeys: string[];
  existingCertConfigMaps: string[];
  existingCertSecrets: string[];
  setSecureDBInfo: (info: SecureDBInfo) => void;
}

export const CreateMRSecureDBSection: React.FC<CreateMRSecureDBSectionProps> = ({
  secureDBInfo,
  modelRegistryNamespace,
  nameDesc,
  existingCertKeys,
  existingCertConfigMaps,
  existingCertSecrets,
  setSecureDBInfo,
}) => {
  const [searchValue, setSearchValue] = useState('');

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

  const getFilteredExistingCAResources = () => (
    <>
      <MenuGroup label="ConfigMaps">
        {existingCertConfigMaps
          .filter((configMap) => configMap.toLowerCase().includes(searchValue.toLowerCase()))
          .map((configMap, index) => (
            <MenuItem
              key={`configmap-${index}`}
              onClick={() => {
                setSearchValue('');
                const newInfo = {
                  ...secureDBInfo,
                  configMap,
                  key: '',
                };
                setSecureDBInfo({
                  ...newInfo,
                  isValid: isValid(newInfo),
                });
              }}
            >
              {configMap}
            </MenuItem>
          ))}
      </MenuGroup>
      <MenuGroup label="Secrets">
        {existingCertSecrets
          .filter((secret) => secret.toLowerCase().includes(searchValue.toLowerCase()))
          .map((secret, index) => (
            <MenuItem
              key={`secret-${index}`}
              onClick={() => {
                setSearchValue('');
                const newInfo = {
                  ...secureDBInfo,
                  configMap: secret,
                  key: '',
                };
                setSecureDBInfo({
                  ...newInfo,
                  isValid: isValid(newInfo),
                });
              }}
            >
              {secret}
            </MenuItem>
          ))}
      </MenuGroup>
    </>
  );

  return (
    <>
      <Radio
        isChecked={secureDBInfo.type === SecureDBRType.CLUSTER_WIDE}
        name="cluster-wide-ca"
        onChange={() => handleSecureDBTypeChange(SecureDBRType.CLUSTER_WIDE)}
        label="Use cluster-wide CA bundle"
        description={
          <>
            Use the <strong>ca-bundle.crt</strong> bundle in the{' '}
            <strong>odh-trusted-ca-bundle</strong> ConfigMap.
          </>
        }
        id="cluster-wide-ca"
      />
      <Radio
        isChecked={secureDBInfo.type === SecureDBRType.OPENSHIFT}
        name="openshift-ca"
        onChange={() => handleSecureDBTypeChange(SecureDBRType.OPENSHIFT)}
        label="Use OpenShift AI CA bundle"
        description={
          <>
            Use the <strong>odh-ca-bundle.crt</strong> bundle in the{' '}
            <strong>odh-trusted-ca-bundle</strong> ConfigMap.
          </>
        }
        id="openshift-ca"
      />
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
              onSearchChange={(newValue) => setSearchValue(newValue)}
              onSearchClear={() => setSearchValue('')}
              searchValue={searchValue}
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
              onSearchChange={(newValue) => setSearchValue(newValue)}
              onSearchClear={() => setSearchValue('')}
              searchValue={searchValue}
              toggleText={secureDBInfo.key || 'Select a key'}
            >
              {existingCertKeys
                .filter((item) => item.toLowerCase().includes(searchValue.toLowerCase()))
                .map((item, index) => (
                  <MenuItem
                    key={`key-${index}`}
                    onClick={() => {
                      setSearchValue('');
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
