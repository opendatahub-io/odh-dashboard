import * as React from 'react';
import { Button, Card, CardBody, EmptyStateVariant } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import BiasConfigurationEmptyState from './BiasConfigurationEmptyState';

const EmptyBiasConfigurationCard: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardBody>
        <BiasConfigurationEmptyState
          actionButton={
            <Button
              onClick={() => {
                navigate('../configure', { relative: 'path' });
              }}
            >
              Configure
            </Button>
          }
          variant={EmptyStateVariant.full}
        />
      </CardBody>
    </Card>
  );
};

export default EmptyBiasConfigurationCard;
