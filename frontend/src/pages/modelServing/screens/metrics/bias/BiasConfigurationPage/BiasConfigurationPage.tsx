import * as React from 'react';
import { Breadcrumb, Button, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { BreadcrumbItemType } from '~/types';
import { useModelBiasData } from '~/concepts/trustyai/context/useModelBiasData';
import { InferenceServiceKind } from '~/k8sTypes';
import { getBreadcrumbItemComponents } from '~/pages/modelServing/screens/metrics/utils';
import ManageBiasConfigurationModal from '~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationModal/ManageBiasConfigurationModal';
import { MetricsTabKeys } from '~/pages/modelServing/screens/metrics/types';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import BiasConfigurationTable from './BiasConfigurationTable';
import BiasConfigurationEmptyState from './BiasConfigurationEmptyState';

type BiasConfigurationPageProps = {
  breadcrumbItems: BreadcrumbItemType[];
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationPage: React.FC<BiasConfigurationPageProps> = ({
  breadcrumbItems,
  inferenceService,
}) => {
  const { biasMetricConfigs, loaded, loadError, refresh } = useModelBiasData();
  const navigate = useNavigate();
  const firstRender = React.useRef(true);
  const [isOpen, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (loaded && !loadError) {
      if (firstRender.current) {
        firstRender.current = false;
        if (biasMetricConfigs.length === 0) {
          setOpen(true);
        }
      }
    }
  }, [loaded, biasMetricConfigs, loadError]);

  return (
    <>
      <ApplicationsPage
        title="Bias metric configuration"
        description="Manage the configuration of model bias metrics."
        breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
        headerAction={
          <Button onClick={() => navigate(`../${MetricsTabKeys.BIAS}`, { relative: 'path' })}>
            {biasMetricConfigs.length === 0
              ? `Back to ${getDisplayNameFromK8sResource(inferenceService)}`
              : 'View metrics'}
          </Button>
        }
        loaded={loaded}
        provideChildrenPadding
        empty={biasMetricConfigs.length === 0}
        emptyStatePage={
          <PageSection hasBodyWrapper={false} isFilled>
            <BiasConfigurationEmptyState
              actionButton={<Button onClick={() => setOpen(true)}>Configure metric</Button>}
              variant={EmptyStateVariant.lg}
            />
          </PageSection>
        }
      >
        <BiasConfigurationTable
          inferenceService={inferenceService}
          onConfigure={() => setOpen(true)}
        />
      </ApplicationsPage>
      <ManageBiasConfigurationModal
        isOpen={isOpen}
        onClose={(submit) => {
          if (submit) {
            refresh();
          }
          setOpen(false);
        }}
        inferenceService={inferenceService}
      />
    </>
  );
};

export default BiasConfigurationPage;
