import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  ActionListGroup,
  Alert,
  Button,
  ButtonVariant,
  Divider,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Tooltip,
  Content,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhApplication } from '~/types';
import MarkdownView from '~/components/MarkdownView';
import { markdownConverter } from '~/utilities/markdown';
import { useAppContext } from '~/app/AppContext';
import { fireMiscTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { useIntegratedAppStatus } from '~/pages/exploreApplication/useIntegratedAppStatus';
import { useUser } from '~/redux/selectors';

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
  const { enablement } = dashboardConfig.spec.dashboardConfig;
  const [{ isInstalled, canInstall, error }, loaded] = useIntegratedAppStatus(selectedApp);
  const { isAdmin } = useUser();

  if (!selectedApp) {
    return null;
  }

  const renderEnableButton = () => {
    if (!selectedApp.spec.enable || selectedApp.spec.isEnabled || isInstalled || !isAdmin) {
      return null;
    }
    const button = (
      <Button
        variant={ButtonVariant.secondary}
        onClick={onEnable}
        isDisabled={!enablement || !canInstall}
        isLoading={!loaded && !error}
      >
        Enable
      </Button>
    );
    if (enablement) {
      return button;
    }
    return (
      <Tooltip content="This feature has been disabled by an administrator.">
        <span>{button}</span>
      </Tooltip>
    );
  };

  return (
    <DrawerPanelContent
      data-testid="explore-drawer-panel"
      className="odh-get-started"
      isResizable
      minSize="350px"
    >
      <DrawerHead>
        <Content>
          <Content component="h2" style={{ marginBottom: 0 }}>
            {selectedApp.spec.displayName}
          </Content>
          {selectedApp.spec.provider ? (
            <Content component="small">by {selectedApp.spec.provider}</Content>
          ) : null}
        </Content>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      {selectedApp.spec.getStartedLink && (
        <DrawerPanelBody>
          <ActionList>
            <ActionListGroup>
              <ActionListItem>
                <Button
                  icon={<ExternalLinkAltIcon />}
                  onClick={() =>
                    fireMiscTrackingEvent('Explore card get started clicked', {
                      name: selectedApp.metadata.name,
                    })
                  }
                  iconPosition="end"
                  href={selectedApp.spec.getStartedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  component="a"
                >
                  Get started
                </Button>
              </ActionListItem>
              <ActionListItem>{renderEnableButton()}</ActionListItem>
            </ActionListGroup>
          </ActionList>
        </DrawerPanelBody>
      )}
      <Divider />
      <DrawerPanelBody style={{ paddingTop: 0 }}>
        {selectedApp.spec.beta ? (
          <Alert
            variantLabel="error"
            variant="info"
            title={
              selectedApp.spec.betaTitle || `${selectedApp.spec.displayName} is currently in beta.`
            }
            aria-live="polite"
            isInline
          >
            <div
              dangerouslySetInnerHTML={{
                __html: markdownConverter.makeHtml(selectedApp.spec.betaText || DEFAULT_BETA_TEXT),
              }}
            />
          </Alert>
        ) : null}
        <MarkdownView markdown={selectedApp.spec.getStartedMarkDown} />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default GetStartedPanel;
