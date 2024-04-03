import * as React from 'react';
import { CreatePipelineServerButton, usePipelinesAPI } from '~/concepts/pipelines/context';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';

type NoPipelineServerProps = {
  variant?: React.ComponentProps<typeof CreatePipelineServerButton>['variant'];
};

const NoPipelineServer: React.FC<NoPipelineServerProps> = ({ variant = 'link' }) => {
  const {
    pipelinesServer: { installed },
  } = usePipelinesAPI();

  return (
    <EmptyDetailsView
      title="Start by creating a pipeline server"
      description="Standardize and automate machine learning workflows to enable you to further enhance and deploy your data science models."
      iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
      imageAlt=""
      createButton={
        <CreatePipelineServerButton
          isInline
          variant={variant}
          title={installed ? 'Create pipeline' : undefined}
        />
      }
    />
  );
};

export default NoPipelineServer;
