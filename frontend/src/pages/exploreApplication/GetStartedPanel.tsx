import * as React from 'react';
import {
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
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { OdhApplication } from '../../types';
import MarkdownView from '../../components/MarkdownView';
import EnableModal from './EnableModal';

import './GetStartedPanel.scss';
import { useGettingStarted } from '../../utilities/useGettingStarted';

type GetStartedPanelProps = {
  selectedApp?: OdhApplication;
  onClose: () => void;
};

const GetStartedPanel: React.FC<GetStartedPanelProps> = ({ selectedApp, onClose }) => {
  const [enableOpen, setEnableOpen] = React.useState<boolean>(false);
  const appName = selectedApp?.metadata.name;
  const { odhGettingStarted, loaded, loadError } = useGettingStarted(appName);
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

  const onEnableClose = (success?: boolean) => {
    if (success) {
      selectedApp.spec.isEnabled = true;
    }
    setEnableOpen(false);
  };

  const onEnable = () => {
    setEnableOpen(true);
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
            {selectedApp.spec.enable && !selectedApp.spec.isEnabled ? (
              <Button variant={ButtonVariant.secondary} onClick={onEnable}>
                Enable
              </Button>
            ) : null}
          </DrawerPanelBody>
        ) : null}
        <DrawerPanelBody className="odh-get-started__body">
          {renderMarkdownContents()}
        </DrawerPanelBody>
      </DrawerPanelContent>
      {enableOpen ? <EnableModal onClose={onEnableClose} selectedApp={selectedApp} /> : null}
    </>
  );
};

export default GetStartedPanel;
