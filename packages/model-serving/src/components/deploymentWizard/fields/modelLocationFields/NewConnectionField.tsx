import * as React from 'react';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { ModelLocationType, ModelLocationData, ConnectionTypeRefs } from './types';
import ModelLocationFormFields from './ModelLocationFormFields';
import { ModelLocationFieldData } from '../ModelLocationSelectField';

type NewConnectionFieldProps = {
  modelLocationType: (typeof ModelLocationType)[keyof typeof ModelLocationType];
  connectionTypes: ConnectionTypeConfigMapObj[];
  setModelLocationData?: (data: ModelLocationData | undefined) => void;
  modelLocationData?: ModelLocationData;
};

export const NewConnectionField: React.FC<NewConnectionFieldProps> = ({
  modelLocationType,
  connectionTypes,
  setModelLocationData,
  modelLocationData,
}) => {
  const getConnectionType = (locationType: ModelLocationFieldData) => {
    switch (locationType) {
      case ModelLocationType.S3:
        return connectionTypes.find(
          (ct) => ct.metadata.name === 's3' || ct.metadata.name.includes('aws'),
        );
      case ModelLocationType.OCI:
        return connectionTypes.find((ct) => ct.metadata.name === ConnectionTypeRefs.OCI);
      case ModelLocationType.URI:
        return connectionTypes.find((ct) => ct.metadata.name === ConnectionTypeRefs.URI);
      default:
        return undefined;
    }
  };

  const connectionType = getConnectionType(modelLocationType);

  if (!connectionType) {
    return <div>Connection type not found for {modelLocationType}</div>;
  }

  return (
    <>
      <ModelLocationFormFields
        fields={connectionType.data?.fields}
        isPreview={false}
        setModelLocationData={setModelLocationData}
        connectionType={connectionType.metadata.name}
        modelLocationData={modelLocationData}
      />
    </>
  );
};
