import { Alert, Flex, FlexItem, FormGroup, FormHelperText, Spinner } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { toAccessModeFullName } from '#~/pages/projects/screens/detail/storage/AccessModeFullName';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import AccessModeRadio from './AccessModeRadio';
import { getAccessModePopover } from './getAccessModePopover';

type AccessModeFieldProps = {
  currentAccessMode?: AccessMode;
  canEditAccessMode?: boolean;
  storageClassesLoaded: boolean;
  adminSupportedAccessModes: AccessMode[];
  setAccessMode: (value: AccessMode) => void;
};

const AccessModeField: React.FC<AccessModeFieldProps> = ({
  currentAccessMode,
  canEditAccessMode,
  setAccessMode,
  storageClassesLoaded,
  adminSupportedAccessModes,
}) => {
  if (!storageClassesLoaded) {
    return <Spinner />;
  }

  return (
    <FormGroup
      label="Access mode"
      fieldId="access-mode"
      labelHelp={
        <FieldGroupHelpLabelIcon
          content={getAccessModePopover({
            adminSupportedAccessModes,
            canEditAccessMode,
            currentAccessMode,
            showAllAccessModes: false,
          })}
        />
      }
    >
      {canEditAccessMode ? (
        <>
          <Flex>
            {adminSupportedAccessModes.map((accessMode) => (
              <FlexItem key={accessMode}>
                <AccessModeRadio
                  id={`${accessMode}-radio`}
                  name={`${accessMode}-radio`}
                  isDisabled={adminSupportedAccessModes.length === 1}
                  isChecked={currentAccessMode === accessMode}
                  onChange={() => setAccessMode(accessMode)}
                  accessMode={accessMode}
                />
              </FlexItem>
            ))}
          </Flex>
          {adminSupportedAccessModes.length > 1 && (
            <FormHelperText>
              <Alert
                variant="info"
                title="Access mode cannot be changed after creation. The default access mode is determined by the selected storage class."
                isInline
                isPlain
              />
            </FormHelperText>
          )}
        </>
      ) : (
        <div data-testid="existing-access-mode">
          {toAccessModeFullName(currentAccessMode || AccessMode.RWO)}
        </div>
      )}
    </FormGroup>
  );
};

export default AccessModeField;
