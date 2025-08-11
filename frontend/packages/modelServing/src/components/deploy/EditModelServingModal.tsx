import React from 'react';
import ManageInferenceServiceModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { isProjectNIMSupported } from '@odh-dashboard/internal/pages/modelServing/screens/projects/nimUtils';
import ManageNIMServingModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import ManageKServeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import useServingRuntimeSecrets from '@odh-dashboard/internal/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { Deployment, ModelResourceType, ServerResourceType } from '../../../extension-points';

export const EditModelServingModal: React.FC<{
  deployment: Deployment;
  onClose: (updated: boolean) => void;
}> = ({ deployment, onClose }) => {
  const isInferenceService = (model: ModelResourceType): model is InferenceServiceKind =>
    model.kind === 'InferenceService';
  const isServingRuntime = (server: ServerResourceType | undefined): server is ServingRuntimeKind =>
    server?.kind === 'ServingRuntime';

  const inferenceService = isInferenceService(deployment.model) ? deployment.model : undefined;
  const servingRuntime = isServingRuntime(deployment.server) ? deployment.server : undefined;

  const { projects } = React.useContext(ProjectsContext);
  const currentProject = projects.find(
    (project) => project.metadata.name === inferenceService?.metadata.namespace,
  );

  const isKServeNIMEnabled = currentProject ? isProjectNIMSupported(currentProject) : false;

  const serverSecrets = useServingRuntimeSecrets(servingRuntime?.metadata.namespace);
  const { serviceAccountName } = servingRuntime
    ? getTokenNames(servingRuntime.metadata.name, servingRuntime.metadata.namespace)
    : { serviceAccountName: undefined };
  const secrets = serverSecrets.data.filter(
    (secret) =>
      secret.metadata.annotations?.['kubernetes.io/service-account.name'] === serviceAccountName,
  );

  return (
    <>
      {deployment.modelServingPlatformId === 'modelmesh' && (
        <ManageInferenceServiceModal
          editInfo={inferenceService}
          onClose={(submit: boolean) => {
            onClose(submit);
          }}
        />
      )}
      {deployment.modelServingPlatformId === 'nim' && isKServeNIMEnabled && (
        <ManageNIMServingModal
          editInfo={{
            servingRuntimeEditInfo: {
              servingRuntime,
              secrets: [],
            },
            inferenceServiceEditInfo: inferenceService,
            secrets,
          }}
          onClose={(submit: boolean) => {
            onClose(submit);
          }}
        />
      )}
      {deployment.modelServingPlatformId === 'kserve' && (
        <ManageKServeModal
          editInfo={{
            servingRuntimeEditInfo: {
              servingRuntime,
              secrets: [],
            },
            inferenceServiceEditInfo: inferenceService,
            secrets,
          }}
          onClose={(submit: boolean) => {
            onClose(submit);
          }}
        />
      )}
    </>
  );
};
