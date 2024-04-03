import * as React from 'react';
import { Alert, CardBody, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from '~/pages/projects/screens/detail/overview/serverModels/AddModelFooter';
import DeployedModelsCard from './DeployedModelsCard';

interface DeployedModelsSectionProps {
  isMultiPlatform: boolean;
}

const DeployedModelsSection: React.FC<DeployedModelsSectionProps> = ({ isMultiPlatform }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const {
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ProjectDetailsContext);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const { error: platformError } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  if (inferenceServices.length === 0) {
    return (
      <CollapsibleSection title="Serve models" data-testid="section-model-server">
        <OverviewCard
          objectType={ProjectObjectType.modelServer}
          sectionType={SectionType.setup}
          title={isMultiPlatform ? 'No model servers' : 'No deployed models'}
        >
          <CardBody>
            {platformError ? (
              <Alert isInline title="Loading error" variant="danger">
                {platformError.message}
              </Alert>
            ) : (
              <TextContent>
                <Text component="small">
                  {isMultiPlatform
                    ? 'Before deploying a model, you must first add a model server.'
                    : 'Each model is deployed on its own model server.'}
                </Text>
              </TextContent>
            )}
          </CardBody>
          {allowCreate && !platformError ? <AddModelFooter /> : null}
        </OverviewCard>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Serve models" data-testid="model-server-section">
      <DeployedModelsCard
        isMultiPlatform={isMultiPlatform}
        namespace={currentProject.metadata.name}
      />
    </CollapsibleSection>
  );
};

export default DeployedModelsSection;
