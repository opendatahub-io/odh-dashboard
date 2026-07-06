import * as React from 'react';
import { HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';
import {
  TrustyInstallModalFormExistingState,
  UseTrustyInstallModalDataExisting,
} from '#~/concepts/trustyai/content/useTrustyInstallModalData';
import { TRUSTYAI_INSTALL_MODAL_TEST_ID } from '#~/concepts/trustyai/const';
import useDebounceCallback from '#~/utilities/useDebounceCallback';

type TrustyDBExistingSecretFieldProps = {
  formData: UseTrustyInstallModalDataExisting;
};

const TrustyDBExistingSecretField: React.FC<TrustyDBExistingSecretFieldProps> = ({
  formData: { data, onCheckState, onDataChange, state },
}) => {
  const delayCheckState = useDebounceCallback(onCheckState, 3000);

  let helperText:
    | {
        message: string;
        variant: React.ComponentProps<typeof HelperTextItem>['variant'];
      }
    | undefined;
  let inputState: React.ComponentProps<typeof TextInput>['validated'];
  switch (state) {
    case TrustyInstallModalFormExistingState.NOT_FOUND:
      helperText = {
        message: 'No match found. Check your entry and try again.',
        variant: 'error',
      };
      inputState = 'error';
      break;
    case TrustyInstallModalFormExistingState.EXISTING:
      inputState = 'success';
      break;
    case TrustyInstallModalFormExistingState.CHECKING:
      helperText = {
        message: 'Checking for secret...',
        variant: 'default',
      };
      break;
    case TrustyInstallModalFormExistingState.UNSURE:
      helperText = {
        message: 'Unable to validate the secret',
        variant: 'warning',
      };
      inputState = 'warning';
      break;
    case TrustyInstallModalFormExistingState.UNKNOWN:
    default:
      inputState = 'default';
  }

  return (
    <>
      <TextInput
        type="text"
        data-testid={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-existing-secret`}
        id={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-existing-secret`}
        name={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-existing-secret`}
        value={data}
        onChange={(e, value) => {
          delayCheckState();
          onDataChange(value.trim());
        }}
        onBlur={() => {
          if (state !== TrustyInstallModalFormExistingState.EXISTING) {
            // If you're not already validated, cancel exiting efforts and check now
            delayCheckState.cancel();
            onCheckState();
          }
        }}
        validated={inputState}
      />
      {helperText && (
        <HelperText>
          <HelperTextItem variant={helperText.variant}>{helperText.message}</HelperTextItem>
        </HelperText>
      )}
    </>
  );
};

export default TrustyDBExistingSecretField;
