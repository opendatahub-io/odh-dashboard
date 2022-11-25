import * as React from 'react';
import { Alert, FormGroup, Select, SelectOption, Skeleton } from '@patternfly/react-core';
import useModelServingProjects from './useModelServingProjects';
import { getProjectDisplayName } from 'pages/projects/utils';

type ExistingProjectFieldProps = {
  fieldId: string;
  selectedProject?: string;
  onSelect: (selection?: string) => void;
  disabled?: boolean;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement | 'parent';
};

const ExistingProjectField: React.FC<ExistingProjectFieldProps> = ({
  fieldId,
  selectedProject,
  onSelect,
  disabled,
  selectDirection = 'down',
  menuAppendTo = 'parent',
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const [projects, loaded, loadError] = useModelServingProjects();

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <Alert title="Error loading projects" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  const options = projects.map((project) => (
    <SelectOption key={project.metadata.name} value={project.metadata.name}>
      {getProjectDisplayName(project)}
    </SelectOption>
  ));

  return (
    <FormGroup label="Project" fieldId={fieldId}>
      <Select
        removeFindDomNode
        selections={selectedProject}
        isOpen={isOpen}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            onSelect(selection);
            setOpen(false);
          }
        }}
        isDisabled={disabled}
        onToggle={setOpen}
        placeholderText="Select the project"
        direction={selectDirection}
        menuAppendTo={menuAppendTo}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ExistingProjectField;
