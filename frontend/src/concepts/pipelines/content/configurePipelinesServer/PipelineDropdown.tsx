import {
  Menu,
  MenuContent,
  MenuItem,
  Dropdown,
  MenuItemAction,
  MenuList,
  MenuToggle,
} from '@patternfly/react-core';
import React from 'react';
import { EyeIcon, EyeSlashIcon, OptimizeIcon } from '@patternfly/react-icons';
import { AWSDataEntry } from '~/pages/projects/types';
import { PIPELINE_AWS_KEY } from '~/pages/projects/dataConnections/const';
import { Connection } from '~/concepts/connectionTypes/types';
import { convertObjectStorageSecretData } from '~/concepts/connectionTypes/utils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { PipelineServerConfigType } from './types';
import { getLabelName } from './utils';

type PipelineDropdownProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
  connections: Connection[];
};
export const PipelineDropdown = ({
  config,
  setConfig,
  connections,
}: PipelineDropdownProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState<boolean[]>([]);

  const existingConnection = (connection: Connection): AWSDataEntry | null =>
    convertObjectStorageSecretData(connection).filter((dataItem) =>
      PIPELINE_AWS_KEY.some((filterItem) => filterItem === dataItem.key),
    );

  const onToggle = () => {
    setShowPassword([]);
    setIsOpen(!isOpen);
  };

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    option?: string | number | null,
  ) => {
    setIsOpen(false);
    if (typeof option === 'string') {
      const value = connections.find((d) => d.metadata.name === option);
      if (!value) {
        return;
      }
      const optionValue = existingConnection(value);
      const updatedObjectStorageValue = config.objectStorage.newValue.map((item) => {
        const matchingOption = optionValue?.find((optItem) => optItem.key === item.key);

        return {
          ...item,
          value: matchingOption ? matchingOption.value : item.value,
        };
      });

      setConfig({
        ...config,
        objectStorage: {
          newValue: updatedObjectStorageValue,
        },
      });
    }
  };
  return (
    <Dropdown
      onOpenChange={(isOpened) => setIsOpen(isOpened)}
      popperProps={{ position: 'right', maxWidth: '600px' }}
      toggle={(toggleRef) => (
        <MenuToggle
          data-testid="select-connection"
          ref={toggleRef}
          onClick={onToggle}
          isExpanded={isOpen}
          icon={<OptimizeIcon />}
        >
          Autofill from connection
        </MenuToggle>
      )}
      isOpen={isOpen}
    >
      <Menu onSelect={onSelect} isScrollable isPlain>
        <MenuContent>
          <MenuList>
            {connections.map((dataItem, index) => (
              <MenuItem
                key={dataItem.metadata.name}
                actions={
                  <MenuItemAction
                    icon={showPassword[index] ? <EyeSlashIcon /> : <EyeIcon />}
                    actionId={index}
                    // eslint-disable-next-line no-console
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setShowPassword((s) => [
                        ...s.slice(0, index),
                        !s[index],
                        ...s.slice(index + 1),
                      ]);
                    }}
                    aria-label={dataItem.metadata.name}
                  />
                }
                description={
                  showPassword[index] ? (
                    <>
                      {existingConnection(dataItem)?.map(
                        (field) =>
                          field.value && (
                            <p key={field.key}>
                              <b>{getLabelName(field.key)}</b> : {field.value}
                            </p>
                          ),
                      )}
                    </>
                  ) : (
                    '•••••••••••••••••'
                  )
                }
                itemId={dataItem.metadata.name}
              >
                {getDisplayNameFromK8sResource(dataItem)}
              </MenuItem>
            ))}
          </MenuList>
        </MenuContent>
      </Menu>
    </Dropdown>
  );
};
