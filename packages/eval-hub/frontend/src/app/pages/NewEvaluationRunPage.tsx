import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardHeader,
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
import paperLinedIcon from '~/app/bgimages/paper-lined.svg';
import paperStackIcon from '~/app/bgimages/paper-stack-ined.svg';

const NewEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();

  return (
    <ApplicationsPage
      title="Select evaluation type"
      description="Select the type of evaluation to run: a single benchmark or a benchmark suite."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem isActive>Select evaluation type</BreadcrumbItem>
        </Breadcrumb>
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
            style={{ cursor: 'pointer' }}
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
            style={{ cursor: 'pointer' }}
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
            <CardTitle id="evaluation-collections-title">Benchmark suite</CardTitle>
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
