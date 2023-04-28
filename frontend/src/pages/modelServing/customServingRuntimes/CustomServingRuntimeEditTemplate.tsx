import * as React from 'react';
import { useParams } from 'react-router';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TemplateKind } from '~/k8sTypes';
import { getServingRuntimeNameFromTemplate } from './utils';
import CustomServingRuntimeAddTemplate from './CustomServingRuntimeAddTemplate';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeEditTemplate: React.FC = () => {
  const {
    servingRuntimeTemplates: { data },
  } = React.useContext(CustomServingRuntimeContext);
  const navigate = useNavigate();
  const { servingRuntimeName } = useParams();
  const ref = React.useRef<TemplateKind>();
  if (!ref.current) {
    ref.current = data.find(
      (template) => getServingRuntimeNameFromTemplate(template) === servingRuntimeName,
    );
  }

  if (!ref.current) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Unable to edit serving runtime
          </Title>
          <EmptyStateBody>We were unable to find a serving runtime by this name</EmptyStateBody>
          <Button variant="primary" onClick={() => navigate(`/servingRuntimes`)}>
            Return to the list
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  return <CustomServingRuntimeAddTemplate existingTemplate={ref.current} />;
};

export default CustomServingRuntimeEditTemplate;
