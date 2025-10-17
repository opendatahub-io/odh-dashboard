import * as React from 'react';
import { FormGroup, Content, Popover, Button } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type ProjectSectionType = {
  projectName: string;
};

const ProjectSection: React.FC<ProjectSectionType> = ({ projectName }) => (
  <FormGroup
    label={
      <>
        Project
        <Popover
          bodyContent="The OpenShift project where the model will be deployed. The inference service and serving runtime objects will be created in this project."
          position="right"
        >
          <Button
            variant="plain"
            aria-label="More info for project field"
            className="pf-v5-u-ml-xs"
          >
            <HelpIcon />
          </Button>
        </Popover>
      </>
    }
  >
    <Content component="p">{projectName}</Content>
  </FormGroup>
);

export default ProjectSection;
