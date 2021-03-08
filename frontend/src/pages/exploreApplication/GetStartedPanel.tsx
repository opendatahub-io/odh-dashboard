import * as React from 'react';
import {
  DrawerPanelBody,
  DrawerHead,
  DrawerPanelContent,
  Title,
  DrawerActions,
  DrawerCloseButton,
  EmptyState,
  EmptyStateVariant,
  Spinner,
  EmptyStateIcon,
  EmptyStateBody,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { ODHApp, ODHGettingStarted } from '../../types';
import MarkdownView from '../../components/MarkdownView';
import { fetchGettingStartedDoc } from '../../services/gettingStartedService';

import './GetStartedPanel.scss';

type GetStartedPanelProps = {
  selectedApp?: ODHApp;
  onClose: () => void;
};

const GetStartedPanel: React.FC<GetStartedPanelProps> = ({ selectedApp, onClose }) => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [odhGettingStarted, setOdhGettingStarted] = React.useState<ODHGettingStarted>();
  const appName = selectedApp?.metadata.name;

  React.useEffect(() => {
    if (appName) {
      setLoaded(false);
      setOdhGettingStarted(undefined);
      fetchGettingStartedDoc(appName)
        .then((gs: ODHGettingStarted) => {
          setLoaded(true);
          setLoadError(undefined);
          setOdhGettingStarted(gs);
        })
        .catch((e) => {
          setLoadError(e);
        });
    }
  }, [appName]);

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

  return (
    <DrawerPanelContent className="odh-get-started" isResizable>
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
        <DrawerPanelBody>
          <span>
            <a
              className="pf-c-button pf-m-primary"
              href={selectedApp.spec.getStartedLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="odh-get-started__get-started-text">Get Started</span>
              <ExternalLinkAltIcon />
            </a>
          </span>
        </DrawerPanelBody>
      ) : null}
      <DrawerPanelBody className="odh-get-started__body">
        {renderMarkdownContents()}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default GetStartedPanel;
