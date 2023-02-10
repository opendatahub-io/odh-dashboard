import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection, Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { BreadcrumbItemType } from '../../../../types';
import ApplicationsPage from '../../../ApplicationsPage';
import MetricsChart from './MetricsChart';
import MetricsPageToolbar from './MetricsPageToolbar';
import { ModelServingMetricsContext, ModelServingMetricType } from './ModelServingMetricsContext';

type MetricsPageProps = {
  title: string;
  breadcrumbItems: BreadcrumbItemType[];
};

const MetricsPage: React.FC<MetricsPageProps> = ({ title, breadcrumbItems }) => {
  const { data } = React.useContext(ModelServingMetricsContext);
  return (
    <ApplicationsPage
      title={title}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbItems.map((item) => (
            <BreadcrumbItem
              isActive={item.isActive}
              key={item.label}
              render={() =>
                item.link ? <Link to={item.link}>{item.label}</Link> : <>{item.label}</>
              }
            />
          ))}
        </Breadcrumb>
      }
      toolbar={<MetricsPageToolbar />}
      loaded
      description={null}
      empty={false}
    >
      <PageSection isFilled>
        <Stack hasGutter>
          <StackItem>
            <MetricsChart
              metrics={data[ModelServingMetricType.ENDPOINT_HEALTH]}
              color="orange"
              title="Endpoint health"
            />
          </StackItem>
          <StackItem>
            <MetricsChart
              metrics={data[ModelServingMetricType.INFERENCE_PERFORMANCE]}
              color="purple"
              title="Inference performance"
            />
          </StackItem>
          <StackItem>
            <MetricsChart
              metrics={data[ModelServingMetricType.AVG_RESPONSE_TIME]}
              color="blue"
              title="Average response time"
              unit="ms"
            />
          </StackItem>
          <StackItem>
            <MetricsChart
              metrics={data[ModelServingMetricType.REQUEST_COUNT]}
              color="green"
              title="Total request"
            />
          </StackItem>
          <StackItem>
            <MetricsChart
              metrics={data[ModelServingMetricType.FAILED_REQUEST_COUNT]}
              color="cyan"
              title="Failed request"
            />
          </StackItem>
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default MetricsPage;
