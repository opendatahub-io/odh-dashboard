import * as React from 'react';
import { useParams } from 'react-router-dom';
import { InferenceServiceKind, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import useServingRuntimeSecrets from '~/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { useServingRuntimesConfig } from '~/pages/modelServing/useServingRuntimesConfig';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import ProjectDetailsContextProvider from './ProjectDetailsContext';

const ModelServingProjectDetailsContextAdditions: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const servingRuntimesConfig = useServingRuntimesConfig();
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const serverSecrets = useContextResourceData<SecretKind>(useServingRuntimeSecrets(namespace));

  return (
    <ProjectDetailsContextProvider
      inferenceServices={inferenceServices}
      serverSecrets={serverSecrets}
      servingRuntimes={servingRuntimes}
      servingRuntimesConfig={servingRuntimesConfig}
    />
  );
};

export default ModelServingProjectDetailsContextAdditions;
