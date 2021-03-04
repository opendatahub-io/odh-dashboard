import * as React from 'react';
import { ODHAppType } from '../../types';
import {
  DrawerPanelBody,
  DrawerHead,
  DrawerPanelContent,
  Title,
  DrawerActions,
  DrawerCloseButton,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

import './GetStartedPanel.scss';
import MarkdownView from '../../components/MarkdownView';

type GetStartedPanelProps = {
  selectedApp?: ODHAppType;
  onClose: () => void;
};

const GetStartedPanel: React.FC<GetStartedPanelProps> = ({ selectedApp, onClose }) => {
  if (!selectedApp) {
    return null;
  }

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
        {selectedApp.spec.getStartedMarkdown ? (
          <MarkdownView markdown={selectedApp.spec.getStartedMarkdown} />
        ) : null}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default GetStartedPanel;
