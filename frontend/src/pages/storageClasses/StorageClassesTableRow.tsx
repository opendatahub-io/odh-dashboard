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
} from '@patternfly/react-core';
import { Tr, Td, ActionsColumn, TableText } from '@patternfly/react-table';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

import { StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { TableRowTitleDescription } from '~/components/table';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { NoValue } from '~/components/NoValue';
import { ColumnLabel } from './constants';
import { isOpenshiftDefaultStorageClass } from './utils';
import { StorageClassEnableSwitch } from './StorageClassEnableSwitch';
import { StorageClassDefaultRadio } from './StorageClassDefaultRadio';
import { StorageClassEditModal } from './StorageClassEditModal';
import { OpenshiftDefaultLabel } from './OpenshiftDefaultLabel';

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
  const storageClassConfig = storageClassConfigMap[storageClass.metadata.name];
  const isOpenshiftDefault = isOpenshiftDefaultStorageClass(storageClass);
  const { metadata, provisioner, reclaimPolicy, volumeBindingMode, allowVolumeExpansion } =
    storageClass;

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
      ([storageClassName, config]) =>
        storageClassName !== storageClass.metadata.name && config?.isEnabled,
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
    storageClass.metadata.name,
    storageClassConfig?.isDefault,
    storageClassConfig?.isEnabled,
    storageClassConfigMap,
  ]);

  const onDefaultRadioChange = React.useCallback(async () => {
    const existingDefaultConfigMap = Object.entries(storageClassConfigMap).find(
      ([name, config]) => storageClass.metadata.name !== name && config?.isDefault,
    );

    if (existingDefaultConfigMap) {
      const [name, config] = existingDefaultConfigMap;
      await updateStorageClassConfig(name, { ...config, isDefault: false });
      refresh();
    }
  }, [storageClass.metadata.name, storageClassConfigMap, refresh]);

  return (
    <Tr>
      <Td dataLabel={ColumnLabel.DisplayName}>
        <TableRowTitleDescription
          title={<TableText wrapModifier="truncate">{storageClassConfig?.displayName}</TableText>}
          description={storageClassConfig?.description}
        />
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
        <StorageClassEnableSwitch
          storageClassName={metadata.name}
          isChecked={!!storageClassConfig?.isEnabled}
          isDisabled={isEnableSwitchDisabled}
          onChange={refresh}
        />
      </Td>

      <Td dataLabel={ColumnLabel.Default}>
        <StorageClassDefaultRadio
          storageClassName={metadata.name}
          isChecked={!!storageClassConfig?.isDefault}
          isDisabled={!storageClassConfig?.isDefault && !storageClassConfig?.isEnabled}
          onChange={onDefaultRadioChange}
        />
      </Td>

      <Td dataLabel={ColumnLabel.LastModified}>
        {storageClassConfig?.lastModified ? (
          <Timestamp date={new Date(storageClassConfig.lastModified)} />
        ) : (
          'Unknown'
        )}
      </Td>

      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () => setIsEditModalOpen(true),
            },
          ]}
        />
      </Td>

      {isEditModalOpen && (
        <StorageClassEditModal
          storageClass={storageClass}
          onSuccess={refresh}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </Tr>
  );
};
