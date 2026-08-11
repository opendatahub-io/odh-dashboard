import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, PageSection, Spinner } from '@patternfly/react-core';
import { CodeEditorControl, Language } from '@patternfly/react-code-editor';
import { CopyIcon, DownloadIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import useDarkMode from '~/app/hooks/useDarkMode';
import { useMaaSGovernanceYaml } from '~/app/hooks/useMaaSGovernanceYaml';
import {
  EventTrackingContext,
  EventTrackingResourceType,
  EventTrackingYAMLAction,
  MaaSEvents,
} from '~/app/types/event-tracking';

const CodeEditor = React.lazy(() =>
  import('@patternfly/react-code-editor').then((mod) => ({ default: mod.CodeEditor })),
);

type MaaSGovernanceYamlTabProps = {
  resourceName: string;
  resourceType: 'subscription' | 'authorizationpolicy';
};

const downloadYaml = (value: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([value], { type: 'text' }));
  link.download = fileName;
  link.click();
};

const MaaSGovernanceYamlTab: React.FC<MaaSGovernanceYamlTabProps> = ({
  resourceName,
  resourceType,
}) => {
  const isDarkMode = useDarkMode();
  const [yaml, loaded, loadError] = useMaaSGovernanceYaml(resourceName, resourceType);
  const [copied, setCopied] = React.useState(false);

  const trackingResourceType =
    resourceType === 'subscription'
      ? EventTrackingResourceType.SUBSCRIPTION
      : EventTrackingResourceType.AUTHPOLICY;

  const fireYamlExported = (action: EventTrackingYAMLAction) => {
    fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_YAML_EXPORTED, {
      resourceType: trackingResourceType,
      context: EventTrackingContext.DETAILS,
      action,
    });
  };

  if (!loaded) {
    return (
      <PageSection hasBodyWrapper={false}>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (loadError || !yaml) {
    return (
      <PageSection hasBodyWrapper={false}>
        <EmptyState icon={ExclamationCircleIcon} headingLevel="h3" titleText="Unable to load YAML">
          <EmptyStateBody>The YAML content could not be retrieved.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} data-testid="resource-yaml-tab-content">
      <React.Suspense
        fallback={
          <Bullseye>
            <Spinner />
          </Bullseye>
        }
      >
        <CodeEditor
          code={yaml}
          language={Language.yaml}
          isDarkTheme={isDarkMode}
          isReadOnly
          isLanguageLabelVisible
          height="600px"
          customControls={[
            <CodeEditorControl
              key="copy"
              icon={<CopyIcon />}
              aria-label="Copy code to clipboard"
              tooltipProps={{
                content: <div>{copied ? 'Content added to clipboard' : 'Copy to clipboard'}</div>,
                'aria-live': 'polite',
                exitDelay: copied ? 1600 : 300,
                onTooltipHidden: () => setCopied(false),
              }}
              onClick={(code) => {
                fireYamlExported(EventTrackingYAMLAction.COPY);
                navigator.clipboard.writeText(code);
                setCopied(true);
              }}
            />,
            <CodeEditorControl
              key="download"
              icon={<DownloadIcon />}
              aria-label="Download code"
              tooltipProps={{ content: <div>Download</div> }}
              onClick={(code) => {
                fireYamlExported(EventTrackingYAMLAction.DOWNLOAD);
                downloadYaml(code, `${resourceName}.yaml`);
              }}
            />,
          ]}
        />
      </React.Suspense>
    </PageSection>
  );
};

export default MaaSGovernanceYamlTab;
