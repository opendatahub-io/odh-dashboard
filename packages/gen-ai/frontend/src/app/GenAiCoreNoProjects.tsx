import * as React from 'react';
import { Content } from '@patternfly/react-core';
import ModelsEmptyState from './EmptyStates/NoData';

const GenAiCoreNoProjects: React.FC = () => (
  <ModelsEmptyState
    title="You must create a project to begin"
    description={
      <Content
        style={{
          textAlign: 'left',
        }}
      >
        <Content component="p">To create a project:</Content>
        <Content component="ol">
          <Content component="li">
            Go to the <b>Projects</b> page
          </Content>
          <Content component="li">
            Select <b>Create new project</b>
          </Content>
          <Content component="li">
            Complete the steps to create a project then come back here
          </Content>
        </Content>
      </Content>
    }
    actionButtonText="Go to Projects page"
    actionButtonHref="/projects"
  />
);

export default GenAiCoreNoProjects;
