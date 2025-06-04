import {
  Alert,
  Flex,
  FlexItem,
  FormGroup,
  FormGroupLabelHelp,
  FormHelperText,
  List,
  ListItem,
  Popover,
} from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { ACCESS_MODE_RADIO_NAMES } from './constants';
import { useGetStorageClassConfig } from './useGetStorageClassConfig';
import AccessModeRadio from './AccessModeRadio';

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
  const showRWX = openshiftSupportedAccessModes.includes(AccessMode.RWX);
  const showROX = openshiftSupportedAccessModes.includes(AccessMode.ROX);
  const showRWOP = openshiftSupportedAccessModes.includes(AccessMode.RWOP);

  const hasRWX = adminSupportedAccessModes.includes(AccessMode.RWX);
  const hasROX = adminSupportedAccessModes.includes(AccessMode.ROX);
  const hasRWOP = adminSupportedAccessModes.includes(AccessMode.RWOP);

  const labelHelpRef = React.useRef(null);

  if (!storageClassesLoaded) {
    return null;
  }

  return (
    <FormGroup
      label="Access mode"
      fieldId="access-mode"
      labelHelp={
        <Popover
          triggerRef={labelHelpRef}
          bodyContent={
            <>
              <div>
                Access mode is a Kubernetes concept that determines how nodes can interact with the
                volume.
              </div>
              <br />
              <List>
                {(canEditAccessMode || currentAccessMode === AccessMode.RWO) && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.RWO]}</b> means that the storage can be
                    attached to a single workbench at a given time.
                  </ListItem>
                )}
                {((showRWX && hasRWX && canEditAccessMode) ||
                  currentAccessMode === AccessMode.RWX) && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.RWX]}</b> means that the storage can be
                    attached to many workbenches simultaneously.
                  </ListItem>
                )}
                {((showROX && hasROX && canEditAccessMode) ||
                  currentAccessMode === AccessMode.ROX) && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.ROX]}</b> means that the storage can be
                    attached to many workbenches as read-only.
                  </ListItem>
                )}
                {((showRWOP && hasRWOP && canEditAccessMode) ||
                  currentAccessMode === AccessMode.RWOP) && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.RWOP]}</b> means that the storage can be
                    attached to a single pod on a single node as read-write.
                  </ListItem>
                )}
              </List>
            </>
          }
        >
          <FormGroupLabelHelp ref={labelHelpRef} aria-label="More info for access mode field" />
        </Popover>
      }
    >
      {canEditAccessMode ? (
        <>
          <Flex>
            <FlexItem>
              <AccessModeRadio
                id="access-mode-rwo"
                name="access-mode-rwo"
                isDisabled={false}
                isChecked={currentAccessMode === AccessMode.RWO}
                onChange={() => setAccessMode(AccessMode.RWO)}
                accessMode={AccessMode.RWO}
              />
            </FlexItem>
            {showRWX && (
              <FlexItem>
                <AccessModeRadio
                  id="access-mode-rwx"
                  name="access-mode-rwx"
                  isDisabled={!hasRWX}
                  isChecked={currentAccessMode === AccessMode.RWX}
                  onChange={() => setAccessMode(AccessMode.RWX)}
                  accessMode={AccessMode.RWX}
                />
              </FlexItem>
            )}
            {showROX && (
              <FlexItem>
                <AccessModeRadio
                  id="access-mode-rox"
                  name="access-mode-rox"
                  isDisabled={!hasROX}
                  isChecked={currentAccessMode === AccessMode.ROX}
                  onChange={() => setAccessMode(AccessMode.ROX)}
                  accessMode={AccessMode.ROX}
                />
              </FlexItem>
            )}
            {showRWOP && (
              <FlexItem>
                <AccessModeRadio
                  id="access-mode-rwop"
                  name="access-mode-rwop"
                  isDisabled={!hasRWOP}
                  isChecked={currentAccessMode === AccessMode.RWOP}
                  onChange={() => setAccessMode(AccessMode.RWOP)}
                  accessMode={AccessMode.RWOP}
                />
              </FlexItem>
            )}
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
        <>{ACCESS_MODE_RADIO_NAMES[currentAccessMode || AccessMode.RWO]}</>
      )}
    </FormGroup>
  );
};

export default AccessModeField;
