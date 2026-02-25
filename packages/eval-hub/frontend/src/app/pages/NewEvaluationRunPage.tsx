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
import { Link } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

type EvaluationType = 'collections' | 'benchmarks';

const NewEvaluationRunPage: React.FC = () => {
  const [selected, setSelected] = React.useState<EvaluationType | undefined>(undefined);

  return (
    <ApplicationsPage
      title="New evaluation run"
      description="Choose standardised benchmarks or benchmark collections to evaluate your agent, model or dataset."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to=".." relative="path">
                Evaluations
              </Link>
            )}
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
          minWidths={{ default: '100%', lg: 'calc(50% - 1rem / 2)' }}
          maxWidths={{ default: '100%', lg: 'calc(50% - 1rem / 2)' }}
        >
          <Card
            isSelectable
            isSelected={selected === 'collections'}
            data-testid="evaluation-collections-card"
          >
            <CardHeader
              selectableActions={{
                selectableActionId: 'evaluation-collections-card-action',
                selectableActionAriaLabelledby: 'evaluation-collections-title',
                name: 'evaluation-type',
                variant: 'single',
                isChecked: selected === 'collections',
                onChange: () => setSelected('collections'),
                isHidden: true,
              }}
            />
            <CardTitle id="evaluation-collections-title">Evaluation collections</CardTitle>
            <CardBody>
              <Content component="small">
                Evaluate models, agents, and datasets using evaluation collections tailored to your
                industry and use case.
              </Content>
            </CardBody>
          </Card>

          <Card
            isSelectable
            isSelected={selected === 'benchmarks'}
            data-testid="standardised-benchmarks-card"
          >
            <CardHeader
              selectableActions={{
                selectableActionId: 'standardised-benchmarks-card-action',
                selectableActionAriaLabelledby: 'standardised-benchmarks-title',
                name: 'evaluation-type',
                variant: 'single',
                isChecked: selected === 'benchmarks',
                onChange: () => setSelected('benchmarks'),
                isHidden: true,
              }}
            />
            <CardTitle id="standardised-benchmarks-title">Standardised benchmarks</CardTitle>
            <CardBody>
              <Content component="small">
                Use industry-standard benchmarks for comprehensive model evaluation.
              </Content>
            </CardBody>
          </Card>
        </Gallery>
      </PageSection>
    </ApplicationsPage>
  );
};

export default NewEvaluationRunPage;
