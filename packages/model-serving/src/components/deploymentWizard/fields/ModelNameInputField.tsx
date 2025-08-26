// import K8sNameDescriptionField, {
//   useK8sNameDescriptionFieldData,
// } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
// import {
//   K8sNameDescriptionFieldData,
//   K8sNameDescriptionType,
//   UseK8sNameDescriptionFieldData,
//   K8sNameDescriptionFieldUpdateFunction,
// } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types.js';
// import React from 'react';
// import { FormGroup } from '@patternfly/react-core';
// import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation.js';
// import { z } from 'zod';
// import { ModelDeploymentStepData } from '../steps/ModelDeploymentStep';

// export const deploymentNameInputFieldSchema = z.boolean();

// // // Custom type guard that only accepts K8sNameDescriptionType
// // export const isK8sNameDescriptionTypeOnly = (
// //   x?: K8sNameDescriptionType | K8sNameDescriptionFieldData,
// // ): x is K8sNameDescriptionType => {
// //   return !!x && 'k8sName' in x && typeof x.k8sName === 'string';
// // };

// // // Helper function to check K8sNameDescriptionFieldData type
// // export const isK8sNameDescriptionFieldData = (
// //   data?: K8sNameDescriptionFieldData | K8sNameDescriptionType,
// // ): data is K8sNameDescriptionFieldData => {
// //   return !!data && !isK8sNameDescriptionTypeOnly(data);
// // };

// // export const useDeploymentName = (
// //   existingData?: K8sNameDescriptionFieldData | K8sNameDescriptionType,
// // ): UseK8sNameDescriptionFieldData => {
// //   return useK8sNameDescriptionFieldData(isK8sNameDescriptionTypeOnly(existingData) ? {initialData: existingData} : undefined);
// // };

// // Component

// type ModelNameInputFieldProps = {
//   deploymentName: K8sNameDescriptionFieldData;
//   setDeploymentName?: K8sNameDescriptionFieldUpdateFunction;
//   validation: ReturnType<typeof useZodFormValidation<ModelDeploymentStepData>>;
// };

// export const ModelNameInputField: React.FC<ModelNameInputFieldProps> = ({
//   deploymentName,
//   setDeploymentName,
//   validation,
// }) => {
//   return (
//     <FormGroup fieldId="model-name-input" isRequired>
//       <K8sNameDescriptionField
//         data={deploymentName}
//         onDataChange={setDeploymentName}
//         dataTestId="model-name"
//         nameLabel="Model name"
//         nameHelperText="This is the name of the inference service created when the model is deployed." // TODO: fix to be not KServe specific
//         hideDescription
//       />
//     </FormGroup>
//   );
// };
