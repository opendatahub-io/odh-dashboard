import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { EMPTY_BIAS_CONFIGURATION_DESC, EMPTY_BIAS_CONFIGURATION_TITLE } from './const';

const EmptyBiasConfigurationCard: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardBody>
        <EmptyState>
          <EmptyStateIcon icon={WrenchIcon} />
          <Title headingLevel="h2" size="lg">
            {EMPTY_BIAS_CONFIGURATION_TITLE}
          </Title>
          <EmptyStateBody>{EMPTY_BIAS_CONFIGURATION_DESC}</EmptyStateBody>
          <Button
            onClick={() => {
              navigate('../configure', { relative: 'path' });
            }}
          >
            Configure
          </Button>
        </EmptyState>
      </CardBody>
    </Card>
  );
};

export default EmptyBiasConfigurationCard;
