import React from 'react';
import { Flex, FlexItem, Switch, Tooltip } from '@patternfly/react-core';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import { StorageClassKind } from '~/k8sTypes';

interface StorageClassEnableSwitchProps {
  storageClassName: string;
  isChecked: boolean;
  isDisabled: boolean;
  onChange: () => Promise<void | StorageClassKind[]>;
}

export const StorageClassEnableSwitch: React.FC<StorageClassEnableSwitchProps> = ({
  storageClassName,
  isChecked: isInitialChecked,
  isDisabled,
  onChange,
}) => {
  const [isChecked, setIsChecked] = React.useState(isInitialChecked);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Update checked state when updating isChecked from parent component
  React.useEffect(() => {
    setIsChecked(isInitialChecked);
  }, [isInitialChecked]);

  const update = React.useCallback(
    async (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
      setIsUpdating(true);

      try {
        await updateStorageClassConfig(storageClassName, { isEnabled: checked });
        await onChange();
        setIsUpdating(false);
      } catch {
        setIsUpdating(false);
      }

      setIsChecked(checked);
    },
    [onChange, storageClassName],
  );

  const switchInput = React.useMemo(
    () => (
      <Switch
        id={`${storageClassName}-enable-switch`}
        aria-label="Storage class enable switch"
        isChecked={isChecked}
        aria-checked={isChecked}
        isDisabled={isDisabled || isUpdating}
        onChange={update}
        data-testid="enable-switch"
      />
    ),
    [isChecked, isDisabled, isUpdating, storageClassName, update],
  );

  return (
    <Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        {isDisabled ? (
          <Tooltip content="Set a new default storage class to disable this one.">
            {switchInput}
          </Tooltip>
        ) : (
          switchInput
        )}
      </FlexItem>

      <FlexItem
        className="pf-v5-u-disabled-color-100"
        style={{ visibility: isUpdating ? 'visible' : 'hidden' }}
      >
        {isChecked ? 'Disabling' : 'Enabling'}...
      </FlexItem>
    </Flex>
  );
};
