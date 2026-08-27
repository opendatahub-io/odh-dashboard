import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Popover, PopoverPosition, Stack, StackItem } from '@patternfly/react-core';
import { WhosMyAdministrator, KubeflowDocs } from 'mod-arch-shared';
import { useThemeContext } from 'mod-arch-kubeflow';
import { useAdminStatus } from '~/odh/context/AdminStatusContext';

type AdminHelpActionProps = {
  buttonLabel?: string;
  linkTestId?: string;
  headerContent?: string;
  leadText?: string;
  contentTestId?: string;
  popoverPosition?: PopoverPosition;
};

const AdminHelpAction: React.FC<AdminHelpActionProps> = ({
  buttonLabel = "Who's my administrator?",
  linkTestId = 'whos-my-admin-link',
  headerContent = "Who's my administrator?",
  leadText = 'To request access to a new or existing model registry, contact your administrator.',
  contentTestId = 'whos-my-admin-content',
  popoverPosition = PopoverPosition.left,
}) => {
  const { isMUITheme } = useThemeContext();
  const { isAdmin, loaded, settingsUrl, settingsTitle } = useAdminStatus();

  if (isMUITheme) {
    return <KubeflowDocs buttonLabel={buttonLabel} linkTestId={linkTestId} />;
  }

  if (loaded && isAdmin) {
    return (
      <Popover
        headerContent={headerContent}
        bodyContent={
          <Stack hasGutter data-testid={contentTestId}>
            <StackItem>
              To create a new model registry, go to the <b>{settingsTitle}</b> page.
            </StackItem>
            <StackItem>
              <Link to={settingsUrl} data-testid="model-registry-settings-link">
                Go to <b>{settingsTitle}</b>
              </Link>
            </StackItem>
          </Stack>
        }
        position={popoverPosition}
      >
        <Button variant="link" data-testid={linkTestId}>
          {buttonLabel}
        </Button>
      </Popover>
    );
  }

  return (
    <WhosMyAdministrator
      buttonLabel={buttonLabel}
      headerContent={headerContent}
      leadText={leadText}
      contentTestId={contentTestId}
      linkTestId={linkTestId}
      popoverPosition={popoverPosition}
    />
  );
};

export default AdminHelpAction;
