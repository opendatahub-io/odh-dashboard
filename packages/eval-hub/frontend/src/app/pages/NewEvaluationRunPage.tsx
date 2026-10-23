import * as React from 'react';
import {
  BreadcrumbItem,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Gallery,
  PageSection,
} from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import {
  evaluationBenchmarksRoute,
  evaluationCollectionsRoute,
  evaluationsBaseRoute,
} from '~/app/routes';
import paperLinedIcon from '~/app/bgimages/paper-lined.svg';
import paperStackIcon from '~/app/bgimages/paper-stack-ined.svg';
import './NewEvaluationRunPage.scss';

const NewEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const projectDisplayName = useProjectDisplayName(namespace);

  return (
    <ApplicationsPage
      title="Select evaluation type"
      description="Select the type of evaluation to run: a single benchmark or a collection."
      breadcrumb={
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName={projectDisplayName}
          homePath={evaluationsBaseRoute(namespace)}
          projectHomePath={`/projects/${namespace}`}
        >
          <BreadcrumbItem isActive>Select evaluation type</BreadcrumbItem>
        </ContextBreadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Gallery
          hasGutter
          aria-label="Selectable card container"
          minWidths={{ default: '100%', lg: 'calc(50% - 1rem / 2)' }}
          maxWidths={{ default: '100%', lg: 'calc(50% - 1rem / 2)' }}
        >
          <Card
            data-testid="standardised-benchmarks-card"
            className="evalhub-evaluation-type-card"
            onClick={() => navigate(evaluationBenchmarksRoute(namespace))}
          >
            <CardHeader>
              <img
                src={paperLinedIcon}
                alt=""
                aria-hidden="true"
                style={{ width: 36, height: 36 }}
              />
            </CardHeader>
            <CardTitle id="standardised-benchmarks-title">Benchmark</CardTitle>
            <CardBody>
              <Content component="p">
                Select a single benchmark to evaluate specific model or agent performance metrics.
              </Content>
            </CardBody>
          </Card>

          <Card
            data-testid="evaluation-collections-card"
            className="evalhub-evaluation-type-card"
            onClick={() => navigate(evaluationCollectionsRoute(namespace))}
          >
            <CardHeader>
              <img
                src={paperStackIcon}
                alt=""
                aria-hidden="true"
                style={{ width: 36, height: 36 }}
              />
            </CardHeader>
            <CardTitle id="evaluation-collections-title">Collection</CardTitle>
            <CardBody>
              <Content component="p">
                Select a predefined group of benchmarks that aligns with your industry or use case.
              </Content>
            </CardBody>
          </Card>
        </Gallery>
      </PageSection>
    </ApplicationsPage>
  );
};

export default NewEvaluationRunPage;
