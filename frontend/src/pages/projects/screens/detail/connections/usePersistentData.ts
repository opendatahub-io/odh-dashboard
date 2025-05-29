import React, { useCallback } from 'react';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import { getDefaultValues } from '#~/concepts/connectionTypes/utils';

type UsePersistentDataProps = {
  setConnectionValues: (name: { [key: string]: ConnectionTypeValueType }) => void;
  setConnectionErrors: (error: { [key: string]: boolean | string }) => void;
  setSelectedConnectionType: (name: ConnectionTypeConfigMapObj | undefined) => void;
  connectionValues: { [key: string]: ConnectionTypeValueType };
  selectedConnectionType: ConnectionTypeConfigMapObj | undefined;
};

const usePersistentData = ({
  setConnectionValues,
  setConnectionErrors,
  setSelectedConnectionType,
  connectionValues,
  selectedConnectionType,
}: UsePersistentDataProps): {
  changeSelectionType: (type?: ConnectionTypeConfigMapObj) => void;
} => {
  // if user changes connection types, don't discard previous entries in case of accident
  const previousValues = React.useRef<{
    [connectionTypeName: string]: {
      [key: string]: ConnectionTypeValueType;
    };
  }>({});

  const changeSelectionType = useCallback(
    (type?: ConnectionTypeConfigMapObj) => {
      // save previous connection values
      if (selectedConnectionType) {
        previousValues.current[selectedConnectionType.metadata.name] = connectionValues;
        // clear previous values
        setConnectionValues({});
        setConnectionErrors({});
      }
      // load saved values?
      if (type?.metadata.name && type.metadata.name in previousValues.current) {
        setConnectionValues(previousValues.current[type.metadata.name]);
      } else if (type) {
        // first time load, so add default values
        setConnectionValues(getDefaultValues(type));
      }
      setSelectedConnectionType(type);
    },
    [
      selectedConnectionType,
      connectionValues,
      setConnectionValues,
      setConnectionErrors,
      setSelectedConnectionType,
    ],
  );

  return { changeSelectionType };
};

export default usePersistentData;
