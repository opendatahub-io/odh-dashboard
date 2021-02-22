import React from 'react';
import { connect } from 'react-redux';
import { QuestionCircleIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import {
  PageSection,
  PageSectionVariants,
  Gallery,
  TextContent,
  Text,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  Spinner,
  Title,
  EmptyStateBody,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import OdhAppCard from './OdhAppCard';
import { getComponents } from '../../redux/actions/actions';

import './InstalledApplications.scss';

interface ConnectedInstalledApplicationsProps {
  components: any[];
  getComponents: (installed: boolean) => void;
  componentsLoading: boolean;
  componentsError: { statusCode: number; error: string; message: string };
}
const ConnectedInstalledApplications: React.FC<ConnectedInstalledApplicationsProps> = ({
  components,
  getComponents,
  componentsLoading,
  componentsError,
}) => {
  const [supportType, setSupportType] = React.useState<string>('redhat');
  const [filteredComponents, setFilteredComponents] = React.useState<any[]>([]);

  React.useEffect(() => {
    getComponents(true);
  }, []);

  React.useEffect(() => {
    if (componentsError || componentsLoading) {
      return;
    }

    if (!components) {
      setFilteredComponents([]);
    } else {
      setFilteredComponents(
        components
          .filter((a) => a && a.support === supportType)
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((c) => <OdhAppCard key={c.key} odhApp={c} />),
      );
    }
  }, [components, componentsError, componentsLoading, supportType]);

  const buildComponentList = () => {
    if (componentsError) {
      return (
        <PageSection className="odh-installed-apps__error">
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon icon={WarningTriangleIcon} />
            <Title headingLevel="h5" size="lg">
              Error loading components
            </Title>
            <EmptyStateBody className="odh-installed-apps__error-body">
              <div>
                <code className="odh-installed-apps__display-error">{componentsError.message}</code>
              </div>
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (componentsLoading) {
      return (
        <PageSection className="odh-installed-apps__loading">
          <EmptyState variant={EmptyStateVariant.full}>
            <Spinner size="xl" />
            <Title headingLevel="h5" size="lg">
              Loading
            </Title>
          </EmptyState>
        </PageSection>
      );
    }

    if (!filteredComponents || filteredComponents.length === 0) {
      return (
        <PageSection>
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon icon={QuestionCircleIcon} />

            <Title headingLevel="h5" size="lg">
              No Components Found
            </Title>
          </EmptyState>
        </PageSection>
      );
    }

    return (
      <PageSection className="odh-installed-apps__gallery">
        <Gallery hasGutter>{filteredComponents}</Gallery>
      </PageSection>
    );
  };

  return (
    <>
      <PageSection className="odh-installed-apps__heading" variant={PageSectionVariants.light}>
        <TextContent className="odh-installed-apps__heading__text">
          <Text component="h1">Installed</Text>
          <Text component="p">
            Open Data Hub (ODH) is an open source project based on Kubeflow that provides opens
            source AI tools for running large and distributed AI workloads on OpenShift Container
            Platform. Currently, the Open Data Hub project provides open source tools for data
            storage, distributed AI and Machine Learning (ML) workflows, Jupyter Notebook
            development environment and monitoring.
          </Text>
        </TextContent>
        <ToggleGroup aria-label="supported applications">
          <ToggleGroupItem
            text="Red Hat supported"
            isSelected={supportType === 'redhat'}
            onChange={() => setSupportType('redhat')}
          />
          <ToggleGroupItem
            text="Third-party supported"
            isSelected={supportType === 'other'}
            onChange={() => setSupportType('other')}
          />
        </ToggleGroup>
      </PageSection>
      {buildComponentList()}
    </>
  );
};

const mapStateToProps = (state) => {
  return state.appReducer;
};

const mapDispatchToProps = (dispatch) => ({
  getComponents: (installed: boolean) => dispatch(getComponents(installed)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ConnectedInstalledApplications);
