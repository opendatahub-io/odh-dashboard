import React from 'react';

import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  LabelGroup,
  Popover,
  Timestamp,
  Truncate,
} from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { OutlinedQuestionCircleIcon, PencilAltIcon } from '@patternfly/react-icons';

import { updateStorageClassConfig } from '#~/api';
import { NoValue } from '#~/components/NoValue';
import { TableRowTitleDescription } from '#~/components/table';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { MetadataAnnotation, StorageClassConfig, StorageClassKind } from '#~/k8sTypes';
import AccessModeLabel from '#~/pages/projects/screens/spawner/storage/AccessModeLabel';
import { ColumnLabel } from './constants';
import { CorruptedMetadataAlert } from './CorruptedMetadataAlert';
import { OpenshiftDefaultLabel } from './OpenshiftDefaultLabel';
import { ResetCorruptConfigValueAlert } from './ResetCorruptConfigValueAlert';
import { StorageClassDefaultRadio } from './StorageClassDefaultRadio';
import { StorageClassEditModal } from './StorageClassEditModal';
import { StorageClassEnableSwitch } from './StorageClassEnableSwitch';
import { useStorageClassContext } from './StorageClassesContext';
import { StrorageClassConfigValue } from './StorageClassConfigValue';
import { AccessMode } from './storageEnums';
import { isOpenshiftDefaultStorageClass, isValidConfigValue } from './utils';

interface StorageClassesTableRowProps {
  storageClass: StorageClassKind;
}

export const StorageClassesTableRow: React.FC<StorageClassesTableRowProps> = ({ storageClass }) => {
  const { storageClassConfigs, isLoadingDefault, refresh } = useStorageClassContext();
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = React.useState(false);
  const isOpenshiftDefault = isOpenshiftDefaultStorageClass(storageClass);
  const editModalAlertRef =
    React.useRef<React.ComponentProps<typeof StorageClassEditModal>['alert']>();

  const { metadata, provisioner, reclaimPolicy, volumeBindingMode, allowVolumeExpansion } =
    storageClass;
  const storageClassConfig = storageClassConfigs[metadata.name];
  const hasReadableConfig = storageClassConfig !== undefined;
  const isDefaultRadioDisabled =
    (!storageClassConfig?.isDefault && !storageClassConfig?.isEnabled) ||
    isLoadingDefault ||
    isTogglingEnabled;

  const storageClassInfoItems = [
    {
      label: 'OpenShift storage class',
      value: metadata.name,
    },
    {
      label: 'Provisioner',
      value: provisioner,
    },
    {
      label: 'Description',
      value: metadata.annotations?.[MetadataAnnotation.Description] ?? <NoValue />,
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
    const hasOtherStorageClassesEnabled = Object.entries(storageClassConfigs).some(
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
    storageClassConfigs,
  ]);

  const onDefaultRadioChange = React.useCallback(async () => {
    const existingDefaultConfigs = Object.entries(storageClassConfigs).find(
      ([name, config]) => metadata.name !== name && config?.isDefault,
    );

    if (existingDefaultConfigs) {
      const [name, config] = existingDefaultConfigs;
      await updateStorageClassConfig(name, { ...config, isDefault: false });
      refresh();
    }
  }, [metadata.name, storageClassConfigs, refresh]);

  const onEnableSwitchChange = React.useCallback(
    async (update: () => Promise<StorageClassConfig>) => {
      setIsTogglingEnabled(true);

      await update();
      await refresh();
      setIsTogglingEnabled(false);
    },
    [refresh],
  );

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
                    icon={<PencilAltIcon />}
                    variant="plain"
                    aria-label="Corrupt metadata name/description edit button"
                    onClick={() => {
                      editModalAlertRef.current = {
                        title:
                          'Edit the invalid field(s) and save your changes to correct the corrupted metadata.',
                      };
                      setIsEditModalOpen(true);
                    }}
                  />
                }
              />
            }
          >
            {isValidConfigValue('displayName', storageClassConfig.displayName) &&
              (!storageClassConfig.description ||
                isValidConfigValue('description', storageClassConfig.description)) && (
                <TableRowTitleDescription
                  title={
                    <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                      <Truncate content={storageClassConfig.displayName} />
                      {
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        storageClassConfig.accessModeSettings && ( // This check is necessary for runtime safety
                          <LabelGroup data-testid="access-mode-label-group">
                            {Object.values(AccessMode)
                              .filter(
                                (modeValue) =>
                                  storageClassConfig.accessModeSettings[modeValue] &&
                                  modeValue !== AccessMode.RWO,
                              )
                              .map((modeValue) => (
                                <AccessModeLabel key={modeValue} accessMode={modeValue} />
                              ))}
                          </LabelGroup>
                        )
                      }
                    </Flex>
                  }
                  description={storageClassConfig.description}
                  truncateDescriptionLines={2}
                />
              )}
          </StrorageClassConfigValue>
        ) : (
          '-'
        )}
      </Td>

      <Td dataLabel={ColumnLabel.OpenshiftStorageClass}>
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{metadata.name}</FlexItem>

          <FlexItem>
            <Popover
              position="right"
              headerContent="Storage class info"
              bodyContent={
                <DescriptionList isCompact className="pf-v6-u-mt-lg">
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
                style={{ paddingBlock: 0 }}
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
                popoverText="This storage class is temporarily unavailable for use in new cluster storage. Refresh the field to correct the corrupted metadata."
                onSuccess={refresh}
              />
            }
          >
            {isValidConfigValue('isEnabled', storageClassConfig.isEnabled) && (
              <StorageClassEnableSwitch
                storageClassName={metadata.name}
                isChecked={storageClassConfig.isEnabled}
                isDisabled={isEnableSwitchDisabled}
                onChange={onEnableSwitchChange}
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
                onSuccess={refresh}
              />
            }
          >
            {isValidConfigValue('isDefault', storageClassConfig.isDefault) && (
              <StorageClassDefaultRadio
                storageClassName={metadata.name}
                isChecked={storageClassConfig.isDefault === true}
                isDisabled={isDefaultRadioDisabled}
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
                onSuccess={refresh}
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
                          'Correct any invalid fields and save your changes to reset the corrupted metadata. Upon saving, Display name and Last modified will receive valid values, and the Enable and Default parameters will be reset to their default values.',
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
