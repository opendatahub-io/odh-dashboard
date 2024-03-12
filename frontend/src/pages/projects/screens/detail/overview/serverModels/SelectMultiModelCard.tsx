import * as React from 'react';
import { CardBody, Text, TextContent } from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from './AddModelFooter';

const SelectMultiModelCard: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  return (
    <OverviewCard
      objectType={ProjectObjectType.modelServer}
      sectionType={SectionType.serving}
      title="Mult-model serving platform"
      data-testid="multi-serving-platform-card"
    >
      <CardBody>
        <TextContent>
          <Text component="small">
            Multiple models can be deployed on one shared model server. Choose this option when you
            want to deploy a number of small or medium-sized models that can share the server
            resources.
          </Text>
        </TextContent>
      </CardBody>
      {allowCreate ? <AddModelFooter /> : null}
    </OverviewCard>
  );
};

export default SelectMultiModelCard;
