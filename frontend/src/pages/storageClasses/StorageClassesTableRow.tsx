import React from 'react';

import {
  Flex,
  FlexItem,
  Popover,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Timestamp,
  Button,
} from '@patternfly/react-core';
import { Tr, Td, ActionsColumn, TableText } from '@patternfly/react-table';
import { PencilAltIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

import { StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { TableRowTitleDescription } from '~/components/table';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { NoValue } from '~/components/NoValue';
import { ColumnLabel } from './constants';
import { isOpenshiftDefaultStorageClass, isValidConfigValue } from './utils';
import { StorageClassEnableSwitch } from './StorageClassEnableSwitch';
import { StorageClassDefaultRadio } from './StorageClassDefaultRadio';
import { StorageClassEditModal } from './StorageClassEditModal';
import { OpenshiftDefaultLabel } from './OpenshiftDefaultLabel';
import { CorruptedMetadataAlert } from './CorruptedMetadataAlert';
import { ResetCorruptConfigValueAlert } from './ResetCorruptConfigValueAlert';

interface StorageClassesTableRowProps {
  storageClass: StorageClassKind;
  storageClassConfigMap: Record<string, StorageClassConfig | undefined>;
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
}

export const StorageClassesTableRow: React.FC<StorageClassesTableRowProps> = ({
  storageClass,
  storageClassConfigMap,
  refresh,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const isOpenshiftDefault = isOpenshiftDefaultStorageClass(storageClass);
  const { metadata, provisioner, reclaimPolicy, volumeBindingMode, allowVolumeExpansion } =
    storageClass;
  const storageClassConfig = storageClassConfigMap[metadata.name];
  const hasReadableConfig = storageClassConfig !== undefined;
  const editModalAlertRef =
    React.useRef<React.ComponentProps<typeof StorageClassEditModal>['alert']>();

  const storageClassInfoItems = [
    {
      label: 'OpenShift storage class',
      value: storageClassConfig?.displayName,
    },
    {
      label: 'Provisioner',
      value: provisioner,
    },
    {
      label: 'Description',
      value: storageClassConfig?.description ?? <NoValue />,
    },
    {
      label: 'Reclaim policy',
      value: reclaimPolicy,
    },
    {
      label: 'Volume binding mode',
      value: volumeBindingMode,
    },
    {
      label: 'Allow PersistentVolumeClaims to be expanded',
      value: allowVolumeExpansion ? 'True' : 'False',
    },
  ];

  const isEnableSwitchDisabled = React.useMemo(() => {
    const hasOtherStorageClassesEnabled = Object.entries(storageClassConfigMap).some(
      ([storageClassName, config]) => storageClassName !== metadata.name && config?.isEnabled,
    );

    // Prevent disabling when the storage class is enabled and all
    // others are disabled or if the storage class is set as the default
    if (
      storageClassConfig?.isEnabled &&
      (!hasOtherStorageClassesEnabled || storageClassConfig.isDefault)
    ) {
      return true;
    }

    return false;
  }, [
    metadata.name,
    storageClassConfig?.isDefault,
    storageClassConfig?.isEnabled,
    storageClassConfigMap,
  ]);

  const onDefaultRadioChange = React.useCallback(async () => {
    const existingDefaultConfigMap = Object.entries(storageClassConfigMap).find(
      ([name, config]) => metadata.name !== name && config?.isDefault,
    );

    if (existingDefaultConfigMap) {
      const [name, config] = existingDefaultConfigMap;
      await updateStorageClassConfig(name, { ...config, isDefault: false });
      refresh();
    }
  }, [metadata.name, storageClassConfigMap, refresh]);

  return (
    <Tr>
      <Td dataLabel={ColumnLabel.DisplayName}>
        {hasReadableConfig ? (
          <StrorageClassConfigValue
            alert={
              <CorruptedMetadataAlert
                popoverText="Edit the invalid field(s) and save your changes to correct the corrupted metadata."
                action={
                  <Button
                    variant="plain"
                    aria-label="Corrupt metadata name/description edit button"
                    onClick={() => {
                      editModalAlertRef.current = {
                        title:
                          'Edit the invalid field(s) and save your changes to correct the corrupted metadata.',
                      };
                      setIsEditModalOpen(true);
                    }}
                  >
                    <PencilAltIcon />
                  </Button>
                }
              />
            }
          >
            {isValidConfigValue('displayName', storageClassConfig.displayName) &&
              (!storageClassConfig.description ||
                isValidConfigValue('description', storageClassConfig.description)) && (
                <TableRowTitleDescription
                  title={
                    <TableText wrapModifier="truncate">{storageClassConfig.displayName}</TableText>
                  }
                  description={storageClassConfig.description}
                />
              )}
          </StrorageClassConfigValue>
        ) : (
          '-'
        )}
      </Td>

      <Td dataLabel={ColumnLabel.OpenshiftStorageClass}>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>{metadata.name}</FlexItem>

          <FlexItem>
            <Popover
              position="right"
              headerContent="Storage class info"
              bodyContent={
                <DescriptionList isCompact className="pf-v5-u-mt-lg">
                  {storageClassInfoItems.map((storageClassInfoItem) => (
                    <DescriptionListGroup key={storageClassInfoItem.label}>
                      <DescriptionListTerm>{storageClassInfoItem.label}</DescriptionListTerm>
                      <DescriptionListDescription>
                        {storageClassInfoItem.value}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ))}
                </DescriptionList>
              }
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="Storage class info popover"
              />
            </Popover>
          </FlexItem>

          {isOpenshiftDefault && (
            <FlexItem>
              <OpenshiftDefaultLabel />
            </FlexItem>
          )}
        </Flex>
      </Td>

      <Td dataLabel={ColumnLabel.Enable}>
        {hasReadableConfig ? (
          <StrorageClassConfigValue
            alert={
              <ResetCorruptConfigValueAlert
                storageClassName={metadata.name}
                storageClassConfig={{
                  ...storageClassConfig,
                  isEnabled: false,
                }}
                variant="danger"
                refresh={refresh}
              />
            }
          >
            {isValidConfigValue('isEnabled', storageClassConfig.isEnabled) && (
              <StorageClassEnableSwitch
                storageClassName={metadata.name}
                isChecked={storageClassConfig.isEnabled}
                isDisabled={isEnableSwitchDisabled}
                onChange={refresh}
              />
            )}
          </StrorageClassConfigValue>
        ) : (
          '-'
        )}
      </Td>

      <Td dataLabel={ColumnLabel.Default}>
        {hasReadableConfig ? (
          <StrorageClassConfigValue
            alert={
              <ResetCorruptConfigValueAlert
                storageClassName={metadata.name}
                storageClassConfig={{
                  ...storageClassConfig,
                  isDefault: false,
                }}
                refresh={refresh}
              />
            }
          >
            {isValidConfigValue('isDefault', storageClassConfig.isDefault) && (
              <StorageClassDefaultRadio
                storageClassName={metadata.name}
                isChecked={storageClassConfig.isDefault}
                isDisabled={!storageClassConfig.isDefault && !storageClassConfig.isEnabled}
                onChange={onDefaultRadioChange}
              />
            )}
          </StrorageClassConfigValue>
        ) : (
          '-'
        )}
      </Td>

      <Td dataLabel={ColumnLabel.LastModified}>
        {hasReadableConfig ? (
          <StrorageClassConfigValue
            alert={
              <ResetCorruptConfigValueAlert
                storageClassName={metadata.name}
                storageClassConfig={storageClassConfig}
                refresh={refresh}
              />
            }
          >
            {isValidConfigValue('lastModified', storageClassConfig.lastModified) && (
              <Timestamp date={new Date(storageClassConfig.lastModified)} />
            )}
          </StrorageClassConfigValue>
        ) : (
          '-'
        )}
      </Td>

      <Td isActionCell>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'nowrap' }}
          spaceItems={{ default: 'spaceItemsNone' }}
          justifyContent={{ default: 'justifyContentFlexEnd' }}
        >
          {!hasReadableConfig && (
            <CorruptedMetadataAlert
              variant="danger"
              popoverText="This storage class is unavailable because its metadata is corrupted. Edit the storage class to correct its metadata."
            />
          )}

          <ActionsColumn
            items={[
              {
                title: 'Edit',
                onClick: () => {
                  editModalAlertRef.current = !hasReadableConfig
                    ? {
                        title: 'Reset the metadata',
                        children:
                          'Correct any invalid fields and save your changes to reset the corrupted metadata. Upon saving, Display name and Last modified will receive valid values, and the Enable and Default parameters will be reset to their default values.',
                      }
                    : undefined;
                  setIsEditModalOpen(true);
                },
              },
            ]}
          />
        </Flex>
      </Td>

      {isEditModalOpen && (
        <StorageClassEditModal
          storageClass={storageClass}
          onSuccess={refresh}
          onClose={() => setIsEditModalOpen(false)}
          alert={editModalAlertRef.current}
        />
      )}
    </Tr>
  );
};

const StrorageClassConfigValue: React.FC<React.PropsWithChildren & { alert: React.ReactNode }> = ({
  alert,
  children,
}) => {
  if (!children) {
    return alert;
  }

  return children;
};
