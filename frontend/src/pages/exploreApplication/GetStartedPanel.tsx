import * as React from 'react';
import {
  Alert,
  Button,
  ButtonVariant,
  DrawerPanelBody,
  DrawerHead,
  DrawerPanelContent,
  DrawerActions,
  DrawerCloseButton,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { OdhApplication } from '../../types';
import { useWatchDashboardConfig } from '../../utilities/useWatchDashboardConfig';
import { useGettingStarted } from '../../utilities/useGettingStarted';
import MarkdownView from '../../components/MarkdownView';

import './GetStartedPanel.scss';

const DEFAULT_BETA_TEXT =
  'Beta means the service is available for early access prior to official' +
  " release and will not appear in the 'Enabled' view. You can still access the service by" +
  ' following the instructions';

type GetStartedPanelProps = {
  selectedApp?: OdhApplication;
  onClose: () => void;
  onEnable: () => void;
};

const GetStartedPanel: React.FC<GetStartedPanelProps> = ({ selectedApp, onClose, onEnable }) => {
  const appName = selectedApp?.metadata.name;
  const { odhGettingStarted, loaded, loadError } = useGettingStarted(appName);
  const { dashboardConfig } = useWatchDashboardConfig();
  if (!selectedApp) {
    return null;
  }

  const renderMarkdownContents = () => {
    if (loadError) {
      return (
        <EmptyState variant={EmptyStateVariant.full}>
          <EmptyStateIcon icon={WarningTriangleIcon} />
          <Title headingLevel="h5" size="md">
            Error loading getting started information
          </Title>
          <EmptyStateBody className="odh-dashboard__error-body">
            <div>
              <code className="odh-dashboard__display-error">{loadError.message}</code>
            </div>
          </EmptyStateBody>
        </EmptyState>
      );
    }

    if (!loaded) {
      return (
        <EmptyState variant={EmptyStateVariant.full}>
          <Spinner size="xl" />
          <Title headingLevel="h5" size="lg">
            Loading
          </Title>
        </EmptyState>
      );
    }

    return <MarkdownView markdown={odhGettingStarted?.markdown} />;
  };

  const renderEnableButton = () => {
    if (!selectedApp.spec.enable || selectedApp.spec.isEnabled) {
      return null;
    }
    const button = (
      <Button
        variant={ButtonVariant.secondary}
        onClick={onEnable}
        isDisabled={!dashboardConfig.enablement}
      >
        Enable
      </Button>
    );
    if (dashboardConfig.enablement) {
      return button;
    }
    return (
      <Tooltip content="This feature has been disabled by an administrator.">
        <span>{button}</span>
      </Tooltip>
    );
  };

  return (
    <>
      <DrawerPanelContent className="odh-get-started" isResizable minSize="350px">
        <DrawerHead>
          <div className="odh-get-started__header">
            <Title headingLevel="h1" size="xl">
              {selectedApp.spec.displayName}
            </Title>
            {selectedApp.spec.provider ? (
              <div>
                <span className="odh-get-started__header__provider">
                  by {selectedApp.spec.provider}
                </span>
              </div>
            ) : null}
          </div>
          <DrawerActions>
            <DrawerCloseButton onClick={onClose} />
          </DrawerActions>
        </DrawerHead>
        {selectedApp.spec.getStartedLink ? (
          <DrawerPanelBody className="odh-get-started__button-panel">
            <a
              className="pf-c-button pf-m-primary"
              href={selectedApp.spec.getStartedLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="odh-get-started__get-started-text">Get started</span>
              <ExternalLinkAltIcon />
            </a>
            {renderEnableButton()}
          </DrawerPanelBody>
        ) : null}
        <DrawerPanelBody className="odh-get-started__body">
          {selectedApp.spec.beta ? (
            <Alert
              variantLabel="error"
              variant="info"
              title={
                selectedApp.spec.betaTitle ||
                `${selectedApp.spec.displayName} is currently in beta.`
              }
              aria-live="polite"
              isInline
            >
              {selectedApp.spec.betaText || DEFAULT_BETA_TEXT}
            </Alert>
          ) : null}
          {renderMarkdownContents()}
        </DrawerPanelBody>
      </DrawerPanelContent>
    </>
  );
};

export default GetStartedPanel;
