import * as React from 'react';
import { CreatePipelineServerButton, usePipelinesAPI } from '#~/concepts/pipelines/context';
import EmptyDetailsView from '#~/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import ImportPipelineButton from './content/import/ImportPipelineButton';

type NoPipelineServerProps = {
  variant?: React.ComponentProps<typeof CreatePipelineServerButton>['variant'];
};

const NoPipelineServer: React.FC<NoPipelineServerProps> = ({ variant = 'link' }) => {
  const {
    pipelinesServer: { installed },
  } = usePipelinesAPI();

  return (
    <EmptyDetailsView
      title={installed ? 'Start by importing a pipeline' : 'Configure a pipeline server'}
      description={
        installed
          ? 'Pipelines are platforms for building and deploying portable and scalable machine-learning (ML) workflows. You can import a pipeline or create one in a workbench.'
          : 'To create or use pipelines, you must first configure a pipeline server in this project. A pipeline server provides the infrastructure necessary for the pipeline to execute steps, track results, and manage runs.'
      }
      iconImage={typedEmptyImage(ProjectObjectType.pipeline, 'MissingModel')}
      imageAlt=""
      createButton={
        installed ? (
          <ImportPipelineButton variant={variant} isInline />
        ) : (
          <CreatePipelineServerButton isInline variant={variant} />
        )
      }
    />
  );
};

export default NoPipelineServer;
