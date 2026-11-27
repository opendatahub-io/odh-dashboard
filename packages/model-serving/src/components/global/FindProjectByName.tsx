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
import { isFindProjectNotice } from '@odh-dashboard/ui-core/context/ProjectsContext';

type FindProjectByNameProps = {
  findProject: (projectName: string, signal?: AbortSignal) => Promise<unknown>;
  onFound: (projectName: string) => void;
};

/**
 * Opens a project by name where the host could not list the caller's
 * projects: the host looks the name up and decides whether it may be used.
 */
const FindProjectByName: React.FC<FindProjectByNameProps> = ({ findProject, onFound }) => {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string>();
  // A notice: the project was found and kept, but cannot be opened here.
  const [notice, setNotice] = React.useState<string>();
  const [isSearching, setIsSearching] = React.useState(false);
  // A lookup still in flight when the form closes (a popover dismissed, a page
  // left) is cancelled: it must not change the working project, navigate, or
  // update the form afterwards.
  const lookupRef = React.useRef<AbortController>();
  React.useEffect(() => () => lookupRef.current?.abort(), []);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) {
      return;
    }
    setIsSearching(true);
    setError(undefined);
    setNotice(undefined);
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    findProject(projectName, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) {
          onFound(projectName);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isFindProjectNotice(err)) {
          setNotice(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Unable to open that project.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
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
        {notice ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="warning" data-testid="find-project-notice">
                {notice}
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
