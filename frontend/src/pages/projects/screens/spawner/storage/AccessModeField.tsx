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
  storageClassName?: string;
  existingAccessMode?: AccessMode;
  // onChange: (value: AccessMode) => void;
};

const AccessModeField: React.FC<AccessModeFieldProps> = ({
  storageClassName,
  existingAccessMode,
}) => {
  const { storageClassesLoaded, adminSupportedAccessModes, openshiftSupportedAccessModes } =
    useGetStorageClassConfig(storageClassName);
  const showRWO = openshiftSupportedAccessModes.includes(AccessMode.RWO);
  const showRWX = openshiftSupportedAccessModes.includes(AccessMode.RWX);
  const showROX = openshiftSupportedAccessModes.includes(AccessMode.ROX);
  const showRWOP = openshiftSupportedAccessModes.includes(AccessMode.RWOP);

  const hasRWO = adminSupportedAccessModes.includes(AccessMode.RWO);
  const hasRWX = adminSupportedAccessModes.includes(AccessMode.RWX);
  const hasROX = adminSupportedAccessModes.includes(AccessMode.ROX);
  const hasRWOP = adminSupportedAccessModes.includes(AccessMode.RWOP);

  const getDefaultAccessMode = () => {
    if (hasRWO) {
      return AccessMode.RWO;
    }
    if (adminSupportedAccessModes.length > 0) {
      return adminSupportedAccessModes[0];
    }
    return undefined;
  };

  const [checkedItem, setCheckedItem] = React.useState(getDefaultAccessMode());
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
                {showRWO && hasRWO && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.RWO]}</b> means that the storage can be
                    attached to a single workbench at a given time.
                  </ListItem>
                )}
                {showRWX && hasRWX && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.RWX]}</b> means that the storage can be
                    attached to many workbenches simultaneously.
                  </ListItem>
                )}
                {showROX && hasROX && (
                  <ListItem>
                    <b>{ACCESS_MODE_RADIO_NAMES[AccessMode.ROX]}</b> means that the storage can be
                    attached to many workbenches as read-only.
                  </ListItem>
                )}
                {showRWOP && hasRWOP && (
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
      {existingAccessMode ? (
        <>{ACCESS_MODE_RADIO_NAMES[existingAccessMode]}</>
      ) : (
        <>
          <Flex>
            {showRWO && (
              <FlexItem>
                <AccessModeRadio
                  id="access-mode-rwo"
                  name="access-mode-rwo"
                  isDisabled={!hasRWO}
                  isChecked={checkedItem === AccessMode.RWO}
                  onChange={() => setCheckedItem(AccessMode.RWO)}
                  accessMode={AccessMode.RWO}
                />
              </FlexItem>
            )}
            <FlexItem>
              <AccessModeRadio
                id="access-mode-rwx"
                name="access-mode-rwx"
                isDisabled={!hasRWX}
                isChecked={checkedItem === AccessMode.RWX}
                onChange={() => setCheckedItem(AccessMode.RWX)}
                accessMode={AccessMode.RWX}
              />
            </FlexItem>
            {showROX && (
              <FlexItem>
                <AccessModeRadio
                  id="access-mode-rox"
                  name="access-mode-rox"
                  isDisabled={!hasROX}
                  isChecked={checkedItem === AccessMode.ROX}
                  onChange={() => setCheckedItem(AccessMode.ROX)}
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
                  isChecked={checkedItem === AccessMode.RWOP}
                  onChange={() => setCheckedItem(AccessMode.RWOP)}
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
      )}
    </FormGroup>
  );
};

export default AccessModeField;
