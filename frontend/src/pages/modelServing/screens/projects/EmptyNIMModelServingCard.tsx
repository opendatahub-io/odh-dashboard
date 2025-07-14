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

type EmptyNIMModelServingCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const EmptyNIMModelServingCard: React.FC<EmptyNIMModelServingCardProps> = ({
  setErrorSelectingPlatform,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <Card
      style={{
        height: '100%',
        border: 'var(--pf-t--global--border--color--default)',
        borderRadius: 16,
      }}
      data-testid="nvidia-nim-model-serving-platform-card"
    >
      <CardTitle>
        <Content component={ContentVariants.h2}>NVIDIA NIM model serving platform</Content>
      </CardTitle>
      <CardBody>
        Models are deployed using NVIDIA NIM microservices. Choose this option when you want to
        deploy your model within a NIM container. Please provide the API key to authenticate with
        the NIM service.
      </CardBody>
      <CardFooter>
        <Bullseye>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.KSERVE_NIM_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="secondary"
            data-testid="nim-serving-select-button"
          />
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

export default EmptyNIMModelServingCard;
