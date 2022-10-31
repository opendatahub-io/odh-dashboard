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
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhApplication } from '../../types';
import MarkdownView from '../../components/MarkdownView';
import { markdownConverter } from '../../utilities/markdown';
import { fireTrackingEvent } from '../../utilities/segmentIOUtils';
import { useAppContext } from '../../app/AppContext';

import './GetStartedPanel.scss';

const DEFAULT_BETA_TEXT =
  'This application is available for early access prior to official ' +
  ' release. It won’t appear in the *Enabled* view, but you can access it by' +
  ' [signing up for beta access.](https://www.starburst.io/platform/starburst-galaxy/).';

type GetStartedPanelProps = {
  selectedApp?: OdhApplication;
  onClose: () => void;
  onEnable: () => void;
};

const GetStartedPanel: React.FC<GetStartedPanelProps> = ({ selectedApp, onClose, onEnable }) => {
  const { dashboardConfig } = useAppContext();
  const enablement = dashboardConfig.spec.dashboardConfig.enablement;
  if (!selectedApp) {
    return null;
  }

  const renderEnableButton = () => {
    if (!selectedApp.spec.enable || selectedApp.spec.isEnabled) {
      return null;
    }
    const button = (
      <Button variant={ButtonVariant.secondary} onClick={onEnable} isDisabled={!enablement}>
        Enable
      </Button>
    );
    if (enablement) {
      return button;
    }
    return (
      <Tooltip removeFindDomNode content="This feature has been disabled by an administrator.">
        <span>{button}</span>
      </Tooltip>
    );
  };

  return (
    <>
      <DrawerPanelContent
        data-id="explore-drawer-panel"
        className="odh-get-started"
        isResizable
        minSize="350px"
      >
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
              onClick={() =>
                fireTrackingEvent('Explore card get started clicked', {
                  name: selectedApp.metadata.name,
                })
              }
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
              <div
                dangerouslySetInnerHTML={{
                  __html: markdownConverter.makeHtml(
                    selectedApp.spec.betaText || DEFAULT_BETA_TEXT,
                  ),
                }}
              />
            </Alert>
          ) : null}
          {<MarkdownView markdown={selectedApp.spec.getStartedMarkDown} />}
        </DrawerPanelBody>
      </DrawerPanelContent>
    </>
  );
};

export default GetStartedPanel;
