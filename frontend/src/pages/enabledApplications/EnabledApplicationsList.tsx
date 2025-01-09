import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Gallery,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import { useWatchComponents } from '~/utilities/useWatchComponents';
import { OdhApplication } from '~/types';
import OdhAppCard from '~/components/OdhAppCard';
import { fireMiscTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { useWatchIntegrationComponents } from '~/utilities/useWatchIntegrationComponents';

const description = `Launch your enabled applications, view documentation, or get started with quick start instructions and tasks.`;

type EnabledApplicationsInnerProps = {
  loaded: boolean;
  loadError?: Error;
  components: OdhApplication[];
  showDescription?: boolean;
};

// use to record the current enabled components
let enabledComponents: OdhApplication[] = [];

export const EnabledApplicationsInner: React.FC<EnabledApplicationsInnerProps> = React.memo(
  ({ loaded, loadError, components, showDescription }) => {
    const isEmpty = components.length === 0;
    const { checkedComponents, isIntegrationComponentsChecked } = useWatchIntegrationComponents(
      loaded ? components : undefined,
    );

    if (loadError) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            icon={ExclamationCircleIcon}
            titleText="Error loading applications"
            variant={EmptyStateVariant.lg}
            data-id="error-empty-state"
          >
            <EmptyStateBody>{loadError.message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (!loaded || !isIntegrationComponentsChecked) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            titleText="Loading"
            variant={EmptyStateVariant.lg}
            data-id="loading-empty-state"
          >
            <Spinner size="xl" />
          </EmptyState>
        </PageSection>
      );
    }
    if (isEmpty) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            icon={QuestionCircleIcon}
            titleText="No applications Found"
            variant={EmptyStateVariant.lg}
          />
        </PageSection>
      );
    }

    return (
      <PageSection
        style={{ height: '100%' }}
        hasBodyWrapper={false}
        isFilled
        data-testid="enabled-application"
      >
        {showDescription ? <Content>{description}</Content> : null}
        <Gallery maxWidths={{ default: '330px' }} role="list" hasGutter>
          {checkedComponents.map((c) => (
            <OdhAppCard key={c.metadata.name} odhApp={c} />
          ))}
        </Gallery>
      </PageSection>
    );
  },
);
EnabledApplicationsInner.displayName = 'EnabledApplicationsInner';

type EnabledApplicationsListProps = {
  showDescription?: boolean;
};

const EnabledApplicationsList: React.FC<EnabledApplicationsListProps> = ({ showDescription }) => {
  const { components, loaded, loadError } = useWatchComponents(true);

  const sortedComponents = React.useMemo(
    () =>
      _.cloneDeep(components)
        .filter((component) => !component.spec.hidden)
        .toSorted((a, b) => a.spec.displayName.localeCompare(b.spec.displayName)),
    [components],
  );

  React.useEffect(() => {
    /*
     * compare the current enabled applications and new fetched enabled applications
     * fire an individual segment.io tracking event for every different enabled application
     */
    if (loaded && components.length) {
      _.difference(
        components.filter((component) => component.spec.isEnabled).map((c) => c.metadata.name),
        enabledComponents
          .filter((component) => component.spec.isEnabled)
          .map((c) => c.metadata.name),
      ).forEach((name) =>
        fireMiscTrackingEvent('Application Enabled', {
          name,
        }),
      );
      enabledComponents = components;
    }
  }, [components, loaded]);

  return (
    <EnabledApplicationsInner
      showDescription={showDescription}
      loaded={loaded}
      components={sortedComponents}
      loadError={loadError}
    />
  );
};

export default EnabledApplicationsList;
