import React from 'react';
import ConnectionTypeForm from '#~/concepts/connectionTypes/ConnectionTypeForm';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import {
  getModelServingConnectionTypeName,
  ModelServingCompatibleTypes,
} from '#~/concepts/connectionTypes/utils';
import { FineTunedModelNewConnectionContext } from '#~/pages/pipelines/global/modelCustomization/fineTunedModelSection/FineTunedModelNewConnectionContext';

type FineTunedModelNewConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
};

export const FineTunedModelNewConnectionField: React.FC<FineTunedModelNewConnectionFieldProps> = ({
  connectionTypes,
}) => {
  const { nameDescData, setNameDescData, connectionValues, setConnectionValues, onValidate } =
    React.useContext(FineTunedModelNewConnectionContext);

  const ociConnectionType = React.useMemo(
    () =>
      connectionTypes
        .filter((t) => t.metadata.annotations?.['opendatahub.io/disabled'] !== 'true')
        // We only use OCI connection here for the ilab
        .find(
          (c) =>
            c.metadata.name === getModelServingConnectionTypeName(ModelServingCompatibleTypes.OCI),
        ),
    [connectionTypes],
  );

  return (
    <ConnectionTypeForm
      options={ociConnectionType ? [ociConnectionType] : []}
      connectionType={ociConnectionType}
      connectionNameDesc={nameDescData}
      setConnectionNameDesc={setNameDescData}
      connectionValues={connectionValues}
      onChange={(field, value) => {
        setConnectionValues((prev) => ({ ...prev, [field.envVar]: value }));
      }}
      onValidate={onValidate}
    />
  );
};
