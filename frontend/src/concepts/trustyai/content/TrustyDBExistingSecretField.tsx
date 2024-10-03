import * as React from 'react';
import { HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';
import {
  TrustyInstallModalFormExistingState,
  UseTrustyInstallModalDataExisting,
} from '~/concepts/trustyai/content/useTrustyInstallModalData';
import { TRUSTYAI_INSTALL_MODAL_TEST_ID } from '~/concepts/trustyai/const';
import useTrustyExistingSecretValidation from '~/concepts/trustyai/content/useTrustyExistingSecretValidation';

type TrustyDBExistingSecretFieldProps = {
  formData: UseTrustyInstallModalDataExisting;
};

const TrustyDBExistingSecretField: React.FC<TrustyDBExistingSecretFieldProps> = ({ formData }) => {
  const { data, onDataChange, state } = formData;
  const { onBlur } = useTrustyExistingSecretValidation(formData);

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
        data-testid={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-existing`}
        id={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-existing`}
        name={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-existing`}
        value={data}
        onChange={(e, value) => onDataChange(value)}
        onBlur={onBlur}
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
