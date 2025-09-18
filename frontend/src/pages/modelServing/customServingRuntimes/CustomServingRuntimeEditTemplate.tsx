import * as React from 'react';
import { useParams } from 'react-router';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TemplateKind } from '#~/k8sTypes';
import { getServingRuntimeNameFromTemplate } from './utils';
import CustomServingRuntimeAddTemplate from './CustomServingRuntimeAddTemplate';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeEditTemplate: React.FC = () => {
  const {
    servingRuntimeTemplates: [data],
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
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to edit serving runtime"
        >
          <EmptyStateBody>We were unable to find a serving runtime by this name</EmptyStateBody>
          <EmptyStateFooter>
            <Button
              variant="primary"
              onClick={() => navigate(`/settings/model-resources-operations/serving-runtimes`)}
            >
              Return to the list
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return <CustomServingRuntimeAddTemplate existingTemplate={ref.current} />;
};

export default CustomServingRuntimeEditTemplate;
