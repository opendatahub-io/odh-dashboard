import * as React from 'react';
import { Alert, FormGroup, Select, SelectOption, Skeleton } from '@patternfly/react-core';
import { getProjectDisplayName } from '../utils';
import useUserProjects from '../screens/projects/useUserProjects';

type ExistingProjectFieldProps = {
  fieldId: string;
  selectedProject?: string;
  onSelect: (selection?: string) => void;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement | 'parent';
};

const ExistingProjectField: React.FC<ExistingProjectFieldProps> = ({
  fieldId,
  selectedProject,
  onSelect,
  selectDirection = 'down',
  menuAppendTo = 'parent',
}) => {
  const [isOpen, setOpen] = React.useState<boolean>(false);

  const [projects, loaded, loadError] = useUserProjects();

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
        variant="typeahead"
        selections={selectedProject}
        isOpen={isOpen}
        onClear={() => {
          onSelect(undefined);
          setOpen(false);
        }}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            onSelect(selection);
            setOpen(false);
          }
        }}
        onToggle={setOpen}
        placeholderText="Select the project connected to the PV"
        direction={selectDirection}
        menuAppendTo={menuAppendTo}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ExistingProjectField;
