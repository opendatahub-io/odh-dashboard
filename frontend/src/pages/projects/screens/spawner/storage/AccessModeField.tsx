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
  openshiftSupportedAccessModes: AccessMode[];
  setAccessMode: (value: AccessMode) => void;
};

const AccessModeField: React.FC<AccessModeFieldProps> = ({
  currentAccessMode,
  canEditAccessMode,
  setAccessMode,
  storageClassesLoaded,
  adminSupportedAccessModes,
  openshiftSupportedAccessModes,
}) => {
  if (!storageClassesLoaded) {
    return <Spinner />;
  }

  const availableAccessModes = Object.values(AccessMode).filter(
    (accessMode: AccessMode) =>
      openshiftSupportedAccessModes.includes(accessMode) || accessMode === AccessMode.RWO,
  );

  const allowedAccessModes = availableAccessModes.filter(
    (accessMode: AccessMode) =>
      adminSupportedAccessModes.includes(accessMode) || accessMode === AccessMode.RWO,
  );

  return (
    <FormGroup
      label="Access mode"
      fieldId="access-mode"
      labelHelp={
        <FieldGroupHelpLabelIcon
          content={getAccessModePopover({
            openshiftSupportedAccessModes,
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
            {availableAccessModes.map((accessMode) => {
              const hasAccessMode = adminSupportedAccessModes.includes(accessMode);
              return (
                <FlexItem key={accessMode}>
                  <AccessModeRadio
                    id={`${accessMode}-radio`}
                    name={`${accessMode}-radio`}
                    isDisabled={!hasAccessMode || availableAccessModes.length === 1}
                    tooltipContent={
                      !hasAccessMode
                        ? 'Access mode not supported by the selected storage class.'
                        : undefined
                    }
                    isChecked={currentAccessMode === accessMode}
                    onChange={() => setAccessMode(accessMode)}
                    accessMode={accessMode}
                  />
                </FlexItem>
              );
            })}
          </Flex>
          {allowedAccessModes.length > 1 && (
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
