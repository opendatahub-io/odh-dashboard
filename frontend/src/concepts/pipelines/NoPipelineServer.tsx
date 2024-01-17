import * as React from 'react';
import {
  EmptyState,
  EmptyStateHeader,
  EmptyStateFooter,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateActions,
} from '@patternfly/react-core';
import { CreatePipelineServerButton } from '~/concepts/pipelines/context';
import { useAppSelector } from '~/redux/hooks';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import emptyStateImg from '~/images/empty-state-pipelines.svg';
import pipelineImage from '~/images/UI_icon-Red_Hat-Branch-RGB.svg';

type NoPipelineServerProps = {
  variant: React.ComponentProps<typeof CreatePipelineServerButton>['variant'];
};

const NoPipelineServer: React.FC<NoPipelineServerProps> = ({ variant }) => {
  const alternateUI = useAppSelector((state) => state.alternateUI);
  if (alternateUI) {
    return (
      <EmptyDetailsView
        title="Start by creating a pipeline"
        description="Standardize and automate machine learning workflows to enable you to further enhance and deploy your data science models."
        iconImage={emptyStateImg}
        allowCreate={true}
        createButton={<CreatePipelineServerButton variant={variant} size="default" />}
      />
    );
  }
  return (
    <EmptyState variant={EmptyStateVariant.sm}>
      <EmptyStateHeader
        titleText="Start by creating a pipeline"
        icon={
          <EmptyStateIcon
            icon={() => <img style={{ width: 64 }} src={pipelineImage} alt="pipeline" />}
          />
        }
        headingLevel="h2"
      />
      <EmptyStateBody>
        Standardize and automate machine learning workflows to enable you to further enhance and
        deploy your data science models.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <CreatePipelineServerButton variant={variant} size="default" />
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default NoPipelineServer;
