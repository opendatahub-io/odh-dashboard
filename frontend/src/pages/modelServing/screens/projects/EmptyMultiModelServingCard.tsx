import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';

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
        border: '1px solid var(--pf-v5-global--BorderColor--100)',
        borderRadius: 16,
      }}
      data-testid="multi-serving-platform-card"
    >
      <CardTitle>
        <TextContent>
          <Text component={TextVariants.h2}>Multi-model serving platform</Text>
        </TextContent>
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
            data-testid="multi-serving-select-button" // TODO this changed from multi-serving-add-server-button, inform QE and look for other cases
          />
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

export default EmptyMultiModelServingCard;
