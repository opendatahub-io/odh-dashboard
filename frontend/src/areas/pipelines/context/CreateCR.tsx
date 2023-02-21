import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { createPipelinesCR } from '../../../api';

type CreateCRProps = {
  namespace: string;
};

const CreateCR: React.FC<CreateCRProps> = ({ namespace }) => {
  const createCR = () => {
    createPipelinesCR(namespace)
      .then(() => {
        alert('created');
      })
      .catch((e) => {
        alert('error! See console');
        console.error('failed to create', e);
      });
  };

  return (
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h1" size="lg">
        Pipelines is not setup
      </Title>
      <EmptyStateBody>You&rsquo;ll need to setup Pipelines for this namespace.</EmptyStateBody>
      <Button variant="primary" onClick={createCR}>
        Enable Pipelines!
      </Button>
    </EmptyState>
  );
};

export default CreateCR;
