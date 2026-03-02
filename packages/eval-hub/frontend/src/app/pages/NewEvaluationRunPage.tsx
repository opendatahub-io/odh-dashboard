import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Content,
  Gallery,
  PageSection,
} from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  evaluationBenchmarksRoute,
  evaluationCollectionsRoute,
  evaluationsBaseRoute,
} from '~/app/routes';

const NewEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();

  return (
    <ApplicationsPage
      title="New evaluation run"
      description="Choose standardised benchmarks or benchmark collections to evaluate your agent, model or dataset."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem isActive>Create evaluation run</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Gallery
          hasGutter
          aria-label="Selectable card container"
          minWidths={{ default: '100%', lg: 'calc(40% - 1rem / 2)' }}
          maxWidths={{ default: '100%', lg: 'calc(40% - 1rem / 2)' }}
        >
          <Card
            data-testid="standardised-benchmarks-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(evaluationBenchmarksRoute(namespace))}
          >
            <CardTitle id="standardised-benchmarks-title">Single benchmark</CardTitle>
            <CardBody>
              <Content component="p">
                Use industry-standard benchmarks for comprehensive model evaluation.
              </Content>
            </CardBody>
          </Card>

          <Card
            data-testid="evaluation-collections-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(evaluationCollectionsRoute(namespace))}
          >
            <CardTitle id="evaluation-collections-title">Benchmark suite</CardTitle>
            <CardBody>
              <Content component="p">
                Evaluate models and agents using evaluation collections tailored to your industry
                and use case.
              </Content>
            </CardBody>
          </Card>
        </Gallery>
      </PageSection>
    </ApplicationsPage>
  );
};

export default NewEvaluationRunPage;
