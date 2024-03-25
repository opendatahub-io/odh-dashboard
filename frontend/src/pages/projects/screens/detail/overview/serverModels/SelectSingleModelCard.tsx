import * as React from 'react';
import { CardBody, Text, TextContent } from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from './AddModelFooter';

const SelectSingleModelCard: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  return (
    <OverviewCard
      objectType={ProjectObjectType.modelServer}
      sectionType={SectionType.serving}
      title="Single-model serving platform"
      data-testid="single-serving-platform-card"
    >
      <CardBody>
        <TextContent>
          <Text component="small">
            Each model is deployed on its own model server. Choose this option when you want to
            deploy a large model such as a large language model (LLM).
          </Text>
        </TextContent>
      </CardBody>
      {allowCreate ? <AddModelFooter /> : null}
    </OverviewCard>
  );
};

export default SelectSingleModelCard;
