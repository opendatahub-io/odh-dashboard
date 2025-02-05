// import { AlertVariant } from '@patternfly/react-core';
// import React from 'react';
// import { ProjectKind } from '~/k8sTypes';
// import useLabeledDataConnections from '~/pages/modelRegistry/screens/RegisteredModels/useLabeledDataConnections';
// import { RegisteredModelDeployInfo } from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
// import {
//   CreatingInferenceServiceObject,
//   InferenceServiceStorageType,
//   LabeledDataConnection,
// } from '~/pages/modelServing/screens/types';
// import { AwsKeys, EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
// import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';
// import { DataConnection, UpdateObjectAtPropAndValue } from '~/pages/projects/types';

// const usePrefillDeployModalFromModelRegistry = (
//   projectContext: { currentProject: ProjectKind; dataConnections: DataConnection[] } | undefined,
//   createData: CreatingInferenceServiceObject,
//   setCreateData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>,
//   registeredModelDeployInfo?: RegisteredModelDeployInfo,
// ): [LabeledDataConnection[], boolean, Error | undefined] => {
//   const [fetchedDataConnections, dataConnectionsLoaded, dataConnectionsLoadError] =
//     useDataConnections(projectContext ? undefined : createData.project);
//   const allDataConnections = projectContext?.dataConnections || fetchedDataConnections;
//   const { dataConnections, storageFields } = useLabeledDataConnections(
//     registeredModelDeployInfo?.modelArtifactUri,
//     allDataConnections,
//   );

//   React.useEffect(() => {
//     if (registeredModelDeployInfo) {
//       setCreateData('name', registeredModelDeployInfo.modelName);
//       const recommendedDataConnections = dataConnections.filter(
//         (dataConnection) => dataConnection.isRecommended,
//       );

//       if (!storageFields) {
//         setCreateData('storage', {
//           awsData: EMPTY_AWS_SECRET_DATA,
//           dataConnection: '',
//           path: '',
//           type: InferenceServiceStorageType.EXISTING_STORAGE,
//         });
//       } else {
//         const prefilledKeys: (typeof EMPTY_AWS_SECRET_DATA)[number]['key'][] = [
//           AwsKeys.NAME,
//           AwsKeys.AWS_S3_BUCKET,
//           AwsKeys.S3_ENDPOINT,
//           AwsKeys.DEFAULT_REGION,
//         ];
//         const prefilledAWSData = [
//           { key: AwsKeys.NAME, value: registeredModelDeployInfo.modelArtifactStorageKey || '' },
//           { key: AwsKeys.AWS_S3_BUCKET, value: storageFields.bucket },
//           { key: AwsKeys.S3_ENDPOINT, value: storageFields.endpoint },
//           { key: AwsKeys.DEFAULT_REGION, value: storageFields.region || '' },
//           ...EMPTY_AWS_SECRET_DATA.filter((item) => !prefilledKeys.includes(item.key)),
//         ];
//         if (recommendedDataConnections.length === 0) {
//           setCreateData('storage', {
//             awsData: prefilledAWSData,
//             dataConnection: '',
//             path: storageFields.path,
//             type: InferenceServiceStorageType.NEW_STORAGE,
//             alert: {
//               type: AlertVariant.info,
//               title:
//                 "We've auto-switched to create a new data connection and pre-filled the details for you.",
//               message:
//                 'Model location info is available in the registry but no matching data connection in the project. So we automatically switched the option to create a new data connection and prefilled the information.',
//             },
//           });
//         } else if (recommendedDataConnections.length === 1) {
//           setCreateData('storage', {
//             awsData: prefilledAWSData,
//             dataConnection: recommendedDataConnections[0].dataConnection.data.metadata.name,
//             path: storageFields.path,
//             type: InferenceServiceStorageType.EXISTING_STORAGE,
//           });
//         } else {
//           setCreateData('storage', {
//             awsData: prefilledAWSData,
//             dataConnection: '',
//             path: storageFields.path,
//             type: InferenceServiceStorageType.EXISTING_STORAGE,
//           });
//         }
//       }
//     }
//   }, [dataConnections, storageFields, registeredModelDeployInfo, setCreateData]);

//   return [dataConnections, dataConnectionsLoaded, dataConnectionsLoadError];
// };

// export default usePrefillDeployModalFromModelRegistry;
