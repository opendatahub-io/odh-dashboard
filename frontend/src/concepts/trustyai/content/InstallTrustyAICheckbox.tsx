import React from 'react';
import { Checkbox, HelperText, HelperTextItem } from '@patternfly/react-core';
import { TRUSTYAI_TOOLTIP_TEXT } from '~/pages/projects/projectSettings/const';
import DeleteTrustyAIModal from '~/concepts/trustyai/content/DeleteTrustyAIModal';

type InstallTrustyAICheckboxProps = {
  isAvailable: boolean;
  isProgressing: boolean;
  onInstall: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  disabled: boolean;
  disabledReason?: string;
};
const InstallTrustyAICheckbox: React.FC<InstallTrustyAICheckboxProps> = ({
  isAvailable,
  isProgressing,
  onInstall,
  onDelete,
  disabled,
  disabledReason,
}) => {
  const [open, setOpen] = React.useState(false);
  const [userHasChecked, setUserHasChecked] = React.useState(false);

  const helperText = disabled ? disabledReason : TRUSTYAI_TOOLTIP_TEXT;

  return (
    <>
      <Checkbox
        label="Enable model bias monitoring"
        body={
          <HelperText>
            <HelperTextItem>{helperText}</HelperTextItem>
          </HelperText>
        }
        isChecked={!disabled && isAvailable}
        isDisabled={disabled || userHasChecked || isProgressing}
        onChange={(e, checked) => {
          if (checked) {
            setUserHasChecked(true);
            onInstall().finally(() => setUserHasChecked(false));
          } else {
            setOpen(true);
          }
        }}
        id="trustyai-service-installation"
        data-testid="trustyai-service-installation"
        name="TrustyAI service installation status"
      />
      <DeleteTrustyAIModal
        isOpen={open}
        onDelete={onDelete}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
};

export default InstallTrustyAICheckbox;
