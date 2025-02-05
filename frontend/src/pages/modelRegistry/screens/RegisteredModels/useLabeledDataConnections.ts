// import React from 'react';
// import { ObjectStorageFields, uriToObjectStorageFields } from '~/concepts/modelRegistry/utils';
// import { LabeledDataConnection } from '~/pages/modelServing/screens/types';
// import { AwsKeys } from '~/pages/projects/dataConnections/const';
// import { convertAWSSecretData } from '~/pages/projects/screens/detail/data-connections/utils';
// import { DataConnection } from '~/pages/projects/types';

// const useLabeledDataConnections = (
//   modelArtifactUri: string | undefined,
//   dataConnections: DataConnection[] = [],
// ): {
//   dataConnections: LabeledDataConnection[];
//   storageFields: ObjectStorageFields | null;
// } =>
//   React.useMemo(() => {
//     if (!modelArtifactUri) {
//       return {
//         dataConnections: dataConnections.map((dataConnection) => ({ dataConnection })),
//         storageFields: null,
//       };
//     }
//     const storageFields = uriToObjectStorageFields(modelArtifactUri);
//     if (!storageFields) {
//       return {
//         dataConnections: dataConnections.map((dataConnection) => ({ dataConnection })),
//         storageFields,
//       };
//     }
//     const labeledDataConnections = dataConnections.map((dataConnection) => {
//       const awsData = convertAWSSecretData(dataConnection);
//       const bucket = awsData.find((data) => data.key === AwsKeys.AWS_S3_BUCKET)?.value;
//       const endpoint = awsData.find((data) => data.key === AwsKeys.S3_ENDPOINT)?.value;
//       const region = awsData.find((data) => data.key === AwsKeys.DEFAULT_REGION)?.value;
//       if (
//         bucket === storageFields.bucket &&
//         endpoint === storageFields.endpoint &&
//         (region === storageFields.region || !storageFields.region)
//       ) {
//         return { dataConnection, isRecommended: true };
//       }
//       return { dataConnection };
//     });
//     return { dataConnections: labeledDataConnections, storageFields };
//   }, [dataConnections, modelArtifactUri]);

// export default useLabeledDataConnections;
