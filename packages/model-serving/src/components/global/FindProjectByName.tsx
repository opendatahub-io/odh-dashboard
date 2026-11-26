import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';

type FindProjectByNameProps = {
  findProject: (projectName: string) => Promise<unknown>;
  onFound: (projectName: string) => void;
};

/**
 * Opens a project by name where the host could not list the caller's
 * projects: the host looks the name up and decides whether it may be used.
 */
const FindProjectByName: React.FC<FindProjectByNameProps> = ({ findProject, onFound }) => {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [isSearching, setIsSearching] = React.useState(false);
  // A lookup still in flight when the form closes (a popover dismissed, a page
  // left) must not navigate or update the form afterwards.
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) {
      return;
    }
    setIsSearching(true);
    setError(undefined);
    findProject(projectName)
      .then(() => {
        if (mountedRef.current) {
          onFound(projectName);
        }
      })
      .catch((err: unknown) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unable to open that project.');
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      });
  };

  return (
    <Form onSubmit={onSubmit} data-testid="find-project-by-name">
      <FormGroup label="Project name" fieldId="find-project-name">
        <TextInput
          id="find-project-name"
          data-testid="find-project-name-input"
          value={name}
          onChange={(_event, value) => setName(value)}
          validated={error ? 'error' : 'default'}
        />
        {error ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error" data-testid="find-project-error">
                {error}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <ActionGroup>
        <Button
          type="submit"
          variant="secondary"
          data-testid="find-project-submit"
          isDisabled={!name.trim() || isSearching}
          isLoading={isSearching}
        >
          Open project
        </Button>
      </ActionGroup>
    </Form>
  );
};

export default FindProjectByName;
