import { Alert, Flex, FlexItem, FormGroup, FormHelperText } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { toAccessModeFullName } from '#~/pages/projects/screens/detail/storage/AccessModeFullName';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import { useGetStorageClassConfig } from './useGetStorageClassConfig';
import AccessModeRadio from './AccessModeRadio';
import { getAccessModePopover } from './getAccessModePopover';

type AccessModeFieldProps = {
  currentAccessMode?: AccessMode;
  storageClassName?: string;
  canEditAccessMode?: boolean;
  setAccessMode: (value: AccessMode) => void;
};

const AccessModeField: React.FC<AccessModeFieldProps> = ({
  currentAccessMode,
  storageClassName,
  canEditAccessMode,
  setAccessMode,
}) => {
  const { storageClassesLoaded, adminSupportedAccessModes, openshiftSupportedAccessModes } =
    useGetStorageClassConfig(storageClassName);

  if (!storageClassesLoaded) {
    return null;
  }

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
            {Object.values(AccessMode).map((accessMode) => {
              const showAccessMode = openshiftSupportedAccessModes.includes(accessMode);
              const hasAccessMode = adminSupportedAccessModes.includes(accessMode);
              return (
                (showAccessMode || accessMode === AccessMode.RWO) && (
                  <FlexItem key={accessMode}>
                    <AccessModeRadio
                      id={`${accessMode}-radio`}
                      name={`${accessMode}-radio`}
                      isDisabled={!hasAccessMode}
                      isChecked={currentAccessMode === accessMode}
                      onChange={() => setAccessMode(accessMode)}
                      accessMode={accessMode}
                    />
                  </FlexItem>
                )
              );
            })}
          </Flex>
          <FormHelperText>
            <Alert
              variant="info"
              title="Access mode cannot be changed after creation. The default access mode is determined by the selected storage class."
              isInline
              isPlain
            />
          </FormHelperText>
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
