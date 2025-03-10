import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  Dropdown,
  MenuItemAction,
  MenuList,
  MenuToggle,
} from '@patternfly/react-core';
import React from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon } from '@patternfly/react-icons';
import styles from '@patternfly/react-styles/css/components/Menu/menu';
import { css } from '@patternfly/react-styles';
import { DataConnection } from '~/pages/projects/types';
import { PipelineServerConfigType } from './types';

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
      const updatedObjectStorageValue = config.objectStorage.newValue.map((item) => ({
        ...item,
      }));

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
      popperProps={{ position: 'right' }}
      toggle={(toggleRef) => (
        <MenuToggle
          data-testid="select-data-connection"
          ref={toggleRef}
          onClick={onToggle}
          isExpanded={isOpen}
        >
          <KeyIcon />
        </MenuToggle>
      )}
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
                  description="•••••••••••••••••"
                  itemId={dataItem.data.metadata.name}
                />
              ))}
            </MenuList>
          </MenuGroup>
        </MenuContent>
      </Menu>
    </Dropdown>
  );
};
