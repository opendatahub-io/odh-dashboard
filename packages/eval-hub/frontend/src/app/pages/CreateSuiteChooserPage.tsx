import * as React from 'react';
import { BreadcrumbItem, Gallery, PageSection } from '@patternfly/react-core';
import { OutlinedListAltIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import CreateSuiteOptionCard from '~/app/components/CreateSuiteOptionCard';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import {
  evaluationBuildSuiteFromGoalRoute,
  evaluationCreateSuiteRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';

const BUILD_FROM_GOAL_ICON = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
  >
    <path d="M16 1.75c.72 4.08 2.17 5.53 6.25 6.25-4.08.72-5.53 2.17-6.25 6.25-.72-4.08-2.17-5.53-6.25-6.25 4.08-.72 5.53-2.17 6.25-6.25Z" />
    <path d="M6.25 13.5c.52 2.96 1.54 3.98 4.5 4.5-2.96.52-3.98 1.54-4.5 4.5-.52-2.96-1.54-3.98-4.5-4.5 2.96-.52 3.98-1.54 4.5-4.5Z" />
  </svg>
);

const CreateSuiteChooserPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const projectDisplayName = useProjectDisplayName(namespace);

  return (
    <ApplicationsPage
      title="Create suite"
      description="Choose how you want to add benchmarks to your suite."
      breadcrumb={
        <div className="pf-v6-u-pb-md">
          <ContextBreadcrumb
            pageName="Evaluations"
            projectDisplayName={projectDisplayName}
            homePath={evaluationsBaseRoute(namespace)}
            projectHomePath={projectHomeRoute(namespace)}
          >
            <BreadcrumbItem isActive>Create suite</BreadcrumbItem>
          </ContextBreadcrumb>
        </div>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled className="pf-v6-u-pt-0">
        <Gallery
          hasGutter
          aria-label="Choose how to build a suite"
          minWidths={{ default: '100%', lg: 'calc(50% - 1rem / 2)' }}
          maxWidths={{ default: '100%', lg: 'calc(50% - 1rem / 2)' }}
        >
          <CreateSuiteOptionCard
            destination={evaluationBuildSuiteFromGoalRoute(namespace)}
            title="Build from a goal"
            description="Describe what you want to evaluate. AI suggests benchmarks from the catalog for you to review and adjust."
            icon={BUILD_FROM_GOAL_ICON}
            testId="build-suite-from-goal-tile"
          />
          <CreateSuiteOptionCard
            destination={evaluationCreateSuiteRoute(namespace)}
            title="Choose your own benchmarks"
            description="Browse the catalog, select benchmarks for your suite, and configure their settings."
            icon={<OutlinedListAltIcon />}
            testId="choose-own-benchmarks-tile"
          />
        </Gallery>
      </PageSection>
    </ApplicationsPage>
  );
};

export default CreateSuiteChooserPage;
