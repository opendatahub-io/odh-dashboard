import * as React from 'react';
import { FormGroup, Text } from '@patternfly/react-core';
import { CreatingInferenceServiceObject } from '../../types';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { getProjectDisplayName } from 'pages/projects/utils';
import { listServingRuntimes } from 'api';
import ExistingProjectField from 'pages/modelServing/screens/projects/InferenceServiceModal/ExistingProjectField';
import { InferenceServiceKind, ProjectKind } from 'k8sTypes';
import { defaultInferenceService } from '../utils';

type ProjectSectionType = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  editInfo?: InferenceServiceKind;
  project?: ProjectKind;
};

const ProjectSection: React.FC<ProjectSectionType> = ({ data, setData, project, editInfo }) => {
  const updateProject = (projectName: string, servingRuntimeName?: string) => {
    setData('project', projectName);
    setData('servingRuntimeName', servingRuntimeName || '');
    setData('storage', defaultInferenceService.storage);
    setData('format', defaultInferenceService.format);
  };

  return (
    <>
      {project ? (
        <FormGroup label="Project">
          <Text>{getProjectDisplayName(project)}</Text>
        </FormGroup>
      ) : (
        <ExistingProjectField
          fieldId="add-existing-storage-pv-selection"
          selectedProject={data.project}
          disabled={editInfo !== undefined}
          onSelect={(projectSelected) => {
            if (projectSelected) {
              listServingRuntimes(projectSelected).then((servingRuntimes) => {
                updateProject(projectSelected, servingRuntimes?.[0].metadata.name || '');
              });
            } else {
              updateProject('');
            }
          }}
        />
      )}
    </>
  );
};

export default ProjectSection;
