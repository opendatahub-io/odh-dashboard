import * as React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  Bullseye,
  Spinner,
  EmptyStateHeader,
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateBody,
  Button,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import ExternalLink from '~/components/ExternalLink';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import { DeleteServerModal, usePipelinesAPI } from './context';

// TODO: Fix doc link to go to more docs on v2
const DOCS_LINK =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_ai_self-managed/2.7/html/release_notes/support-removals_relnotes';

type EnsureCompatiblePipelineServerProps = {
  children: React.ReactNode;
};

const EnsureCompatiblePipelineServer: React.FC<EnsureCompatiblePipelineServerProps> = ({
  children,
}) => {
  const { pipelinesServer } = usePipelinesAPI();
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (pipelinesServer.initializing) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!pipelinesServer.installed) {
    return <NoPipelineServer variant="secondary" />;
  }

  if (!pipelinesServer.compatible) {
    return (
      <>
        <Bullseye data-testid="incompatible-pipelines-server">
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText="Pipeline version cannot be rendered"
              icon={
                <EmptyStateIcon
                  color="var(--pf-v5-global--warning-color--100)"
                  icon={ExclamationTriangleIcon}
                />
              }
            />
            <EmptyStateBody>
              <p>
                Rendering of this pipeline version in the UI is no longer supported, but it can
                still be accessed via the API or OpenShift Console. To remove unsupported versions,
                delete this project&apos;s pipeline server and create a new one.
              </p>
              <ExternalLink
                text="Learn more about supported versions and data recovery"
                to={DOCS_LINK}
              />
            </EmptyStateBody>

            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  data-testid="delete-pipeline-server-button"
                  variant="primary"
                  onClick={() => setIsDeleting(true)}
                >
                  Delete pipeline server
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
        <DeleteServerModal isOpen={isDeleting} onClose={() => setIsDeleting(false)} />
      </>
    );
  }

  return <>{children}</>;
};

export default EnsureCompatiblePipelineServer;
