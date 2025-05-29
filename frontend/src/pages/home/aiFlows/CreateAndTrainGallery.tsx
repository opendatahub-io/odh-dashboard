import * as React from 'react';
import { Content } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import InfoGalleryItem from '#~/concepts/design/InfoGalleryItem';
import { SupportedArea } from '#~/concepts/areas';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import InfoGallery from './InfoGallery';

const CreateAndTrainGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { status: workbenchesAvailable } = useIsAreaAvailable(SupportedArea.WORKBENCHES);
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);

  const infoItems = [];

  if (workbenchesAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="workbenches"
        data-testid="ai-flows-workbenches-info"
        title="Workbenches"
        resourceType={ProjectObjectType.notebook}
        sectionType={SectionType.training}
        description={
          <Content>
            <Content component="small">
              A workbench is an instance of your development and experimentation environment.
              Specify your preferred IDE for model development and training, such as Jupyter
              Notebook; connect to data sources; add persistent storage for data retention;{' '}
              {pipelinesAvailable ? (
                <span data-testid="create-and-train-pipelines-trailer">
                  assign accelerators to optimize performance; and create pipelines to automate
                  machine learning workflows.
                </span>
              ) : (
                <span data-testid="create-and-train-no-pipelines-trailer">
                  and assign accelerators to optimize performance.
                </span>
              )}
            </Content>
          </Content>
        }
        isOpen
      />,
    );
  }

  if (pipelinesAvailable) {
    infoItems.push(
      <InfoGalleryItem
        key="piplelines"
        data-testid="ai-flows-pipelines-info"
        title="Pipelines"
        resourceType={ProjectObjectType.pipeline}
        sectionType={SectionType.training}
        description={
          <Content>
            <Content component="small">
              Pipelines streamline and automate your machine learning workflows, enabling you to
              manage and reproduce complex tasks.
            </Content>
          </Content>
        }
        isOpen
      />,
      <InfoGalleryItem
        key="runs"
        data-testid="ai-flows-runs-info"
        title="Runs"
        resourceType={ProjectObjectType.pipelineRun}
        sectionType={SectionType.training}
        description={
          <Content>
            <Content component="small">
              A run represents a single execution of all steps in a pipeline until it is complete,
              or until a failure occurs.
            </Content>
          </Content>
        }
        isOpen
      />,
    );
  }

  return (
    <InfoGallery
      infoItems={infoItems}
      onClose={onClose}
      closeAlt="train your models"
      closeTestId="ai-flows-close-info"
    />
  );
};

export default CreateAndTrainGallery;
