import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { NamespaceApplicationCase } from '#~/pages/projects/types';

type EmptyMultiModelServingCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const EmptyMultiModelServingCard: React.FC<EmptyMultiModelServingCardProps> = ({
  setErrorSelectingPlatform,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <Card
      style={{
        height: '100%',
        border: '1px solid var(--pf-t--global--border--color--default)',
        borderRadius: 16,
      }}
      data-testid="model-mesh-platform-card"
    >
      <CardTitle>
        <Content>
          <Content component={ContentVariants.h2}>Multi-model serving platform</Content>
        </Content>
      </CardTitle>
      <CardBody>
        Multiple models can be deployed on one shared model server. Choose this option when you want
        to deploy a number of small or medium-sized models that can share the server resources.
      </CardBody>
      <CardFooter>
        <Bullseye>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.MODEL_MESH_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="secondary"
            data-testid="model-mesh-select-button"
          />
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

export default EmptyMultiModelServingCard;
