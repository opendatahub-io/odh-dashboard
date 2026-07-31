import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, PageSection, Spinner } from '@patternfly/react-core';
import { Language } from '@patternfly/react-code-editor';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import useDarkMode from '~/app/hooks/useDarkMode';
import { useSubscriptionManagementYaml } from '~/app/hooks/useSubscriptionManagementYaml';
import {
  EventTrackingContext,
  EventTrackingYAMLAction,
  MaaSEvents,
} from '~/app/types/event-tracking';

const CodeEditor = React.lazy(() =>
  import('@patternfly/react-code-editor').then((mod) => ({ default: mod.CodeEditor })),
);

type SubscriptionManagementYamlTabProps = {
  resourceName: string;
  resourceType: 'subscription' | 'authorizationpolicy';
};

const SubscriptionManagementYamlTab: React.FC<SubscriptionManagementYamlTabProps> = ({
  resourceName,
  resourceType,
}) => {
  const isDarkMode = useDarkMode();
  const [yaml, loaded, loadError] = useSubscriptionManagementYaml(resourceName, resourceType);

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
          isCopyEnabled
          isDownloadEnabled
          isLanguageLabelVisible
          downloadFileName={resourceName}
          height="600px"
          onDownload={(value, fileName) => {
            fireMiscTrackingEvent(MaaSEvents.SUBSCRIPTION_MANAGEMENT_YAML_EXPORTED, {
              resourceType,
              context: EventTrackingContext.DETAILS,
              action: EventTrackingYAMLAction.DOWNLOAD,
            });

            const link = document.createElement('a');
            const objectUrl = URL.createObjectURL(new Blob([value], { type: 'text/yaml' }));
            link.href = objectUrl;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(objectUrl);
          }}
        />
      </React.Suspense>
    </PageSection>
  );
};

export default SubscriptionManagementYamlTab;
