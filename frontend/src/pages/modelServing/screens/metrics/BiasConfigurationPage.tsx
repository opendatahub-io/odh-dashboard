import * as React from 'react';
import {
  Breadcrumb,
  Button,
  EmptyStateVariant,
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { BreadcrumbItemType } from '~/types';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { InferenceServiceKind } from '~/k8sTypes';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import { MetricsTabKeys } from './types';
import BiasConfigurationTable from './BiasConfigurationTable';
import { getBreadcrumbItemComponents } from './utils';
import BiasConfigurationEmptyState from './BiasConfigurationEmptyState';
import ManageBiasConfigurationModal from './biasConfigurationModal/ManageBiasConfigurationModal';

type BiasConfigurationPageProps = {
  breadcrumbItems: BreadcrumbItemType[];
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationPage: React.FC<BiasConfigurationPageProps> = ({
  breadcrumbItems,
  inferenceService,
}) => {
  const { biasMetricConfigs, loaded, loadError, refresh } = useExplainabilityModelData();
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
              ? `Back to ${getInferenceServiceDisplayName(inferenceService)}`
              : 'View metrics'}
          </Button>
        }
        loaded={loaded}
        provideChildrenPadding
        // The page is not empty, we will handle the empty state in the table
        empty={biasMetricConfigs.length === 0}
        emptyStatePage={
          <PageSection isFilled variant={PageSectionVariants.light}>
            <BiasConfigurationEmptyState
              actionButton={<Button onClick={() => setOpen(true)}>Configure metric</Button>}
              variant={EmptyStateVariant.large}
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
