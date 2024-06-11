import {
  Menu,
  Text,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuItemAction,
  MenuList,
  TextContent,
  MenuToggle,
} from '@patternfly/react-core';
import { Dropdown, DropdownPosition } from '@patternfly/react-core/deprecated';
import React from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon } from '@patternfly/react-icons';
import styles from '@patternfly/react-styles/css/components/Menu/menu';
import { css } from '@patternfly/react-styles';
import { DataConnection, AWSDataEntry } from '~/pages/projects/types';
import {
  convertAWSSecretData,
  getDataConnectionDisplayName,
} from '~/pages/projects/screens/detail/data-connections/utils';
import { PIPELINE_AWS_KEY } from '~/pages/projects/dataConnections/const';
import { PipelineServerConfigType } from './types';
import { getLabelName } from './utils';

type PipelineDropdownProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
  dataConnections: DataConnection[];
};
export const PipelineDropdown = ({
  config,
  setConfig,
  dataConnections,
}: PipelineDropdownProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState<boolean[]>([]);

  const existingDataConnection = (connection: DataConnection): AWSDataEntry | null =>
    convertAWSSecretData(connection).filter((dataItem) =>
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
      const value = dataConnections.find((d) => d.data.metadata.name === option);
      if (!value) {
        return;
      }
      const optionValue = existingDataConnection(value);
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
      data-testid="select-data-connection"
      menuAppendTo="parent"
      position={DropdownPosition.right}
      toggle={<MenuToggle onClick={onToggle} icon={<KeyIcon />} />}
      isOpen={isOpen}
    >
      <Menu onSelect={onSelect} isScrollable isPlain>
        <MenuContent>
          <MenuGroup
            label={
              <h1 className={css(styles.menuGroupTitle)}>
                <KeyIcon /> Populate the form with credentials from your selected data connection
              </h1>
            }
          >
            <MenuList>
              {dataConnections.map((dataItem, index) => (
                <MenuItem
                  key={dataItem.data.metadata.name}
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
                      aria-label={dataItem.data.metadata.name}
                    />
                  }
                  description={
                    showPassword[index] ? (
                      <TextContent className={css(styles.menuItemDescription)}>
                        {existingDataConnection(dataItem)?.map(
                          (field) =>
                            field.value && (
                              <Text key={field.key}>
                                <b>{getLabelName(field.key)}</b> : {field.value}
                              </Text>
                            ),
                        )}
                      </TextContent>
                    ) : (
                      '•••••••••••••••••'
                    )
                  }
                  itemId={dataItem.data.metadata.name}
                >
                  {getDataConnectionDisplayName(dataItem)}
                </MenuItem>
              ))}
            </MenuList>
          </MenuGroup>
        </MenuContent>
      </Menu>
    </Dropdown>
  );
};
