import React, { useMemo } from 'react';
import { AboutModal, Alert, Bullseye, Spinner, Content } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ODH_LOGO, ODH_LOGO_DARK, ODH_PRODUCT_NAME } from '#~/utilities/const';
import { DataScienceStackComponentMap } from '#~/concepts/areas/const';
import { DataScienceClusterComponentStatus } from '#~/k8sTypes';
import { useUser, useClusterInfo } from '#~/redux/selectors';
import { useAppContext } from '#~/app/AppContext';
import useFetchDscStatus from '#~/concepts/areas/useFetchDscStatus';
import useFetchDsciStatus from '#~/concepts/areas/useFetchDsciStatus';
import { useWatchOperatorSubscriptionStatus } from '#~/utilities/useWatchOperatorSubscriptionStatus';
import ExternalLink from '#~/components/ExternalLink';
import { useThemeContext } from './ThemeContext';

const RhoaiAboutText = `Red Hat® OpenShift® AI (formerly Red Hat OpenShift Data Science) is a flexible, scalable MLOps platform for data scientists and developers of artificial intelligence and machine learning (AI/ML) applications. Built using open source technologies, OpenShift AI supports the full lifecycle of AI/ML experiments and models, on premise and in the public cloud.`;
const RhoaiDefaultReleaseName = `OpenShift AI`;
const RhoaiDefaultComponentReleaseName = `RHOAI`;

const OdhAboutText = `Open Data Hub is an open source AI platform designed for the hybrid cloud. The community seeks to bridge the gap between application developers, data stewards, and data scientists by blending the leading open source AI tools with a unifying and intuitive user experience. Open Data Hub supports the full lifecycle of AI/ML experiments and models.`;
const OdhDefaultReleaseName = `Open Data Hub`;
const OdhDefaultComponentReleaseName = `ODH`;

interface AboutDialogProps {
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ onClose }) => {
  const { isAdmin } = useUser();
  const { isRHOAI } = useAppContext();
  const { theme } = useThemeContext();
  const { serverURL } = useClusterInfo();
  const [dscStatus, loadedDsc, errorDsc] = useFetchDscStatus();
  const [dsciStatus, loadedDsci, errorDsci] = useFetchDsciStatus();
  const [subStatus, loadedSubStatus, errorSubStatus] = useWatchOperatorSubscriptionStatus();
  const error = errorDsci || errorSubStatus;
  const loading =
    (!errorDsci && !loadedDsci && !loadedDsc) || (!errorSubStatus && !loadedSubStatus && !errorDsc);

  // Group components by display name while merging releases
  const groupedComponents = useMemo(() => {
    const componentMap: Record<
      string,
      { releases: NonNullable<DataScienceClusterComponentStatus['releases']> } | undefined
    > = {};

    Object.entries(dscStatus?.components || {})
      .filter(([, details]) => details.managementState !== 'Removed') // Exclude components with 'Removed' state
      .forEach(([component, details]) => {
        const displayName = DataScienceStackComponentMap[component];
        if (!displayName) {
          return;
        } // Skip components without a mapped name

        // Initialize if not already present
        if (!componentMap[displayName]) {
          componentMap[displayName] = { releases: [] };
        }

        // Merge releases from components with the same display name
        if (details.releases) {
          componentMap[displayName].releases.push(...details.releases);
        }
      });

    // Sort components by display name
    const result = Object.entries(componentMap).toSorted((a, b) => a[0].localeCompare(b[0]));
    result.forEach(([, details]) => {
      // sort in place
      // eslint-disable-next-line no-restricted-properties
      details?.releases.sort((a, b) => a.name.localeCompare(b.name));
    });
    return result;
  }, [dscStatus?.components]);

  return (
    <AboutModal
      className="odh-about-dialog"
      isOpen
      onClose={onClose}
      brandImageSrc={`${window.location.origin}/images/${
        theme !== 'dark' ? ODH_LOGO : ODH_LOGO_DARK
      }`}
      brandImageAlt={`${ODH_PRODUCT_NAME} logo`}
      productName={ODH_PRODUCT_NAME}
      aria-label={ODH_PRODUCT_NAME}
      data-testid="odh-about-dialog"
    >
      <Content style={{ paddingBottom: 48 }}>
        <h4>About</h4>
        <p data-testid="about-text">{isRHOAI ? RhoaiAboutText : OdhAboutText}</p>
      </Content>
      <Content>
        <div style={{ position: 'relative' }}>
          {loading ? (
            <Bullseye style={{ position: 'absolute', width: '100%' }}>
              <Spinner size="xl" />
            </Bullseye>
          ) : null}
          <Content component="dl" style={{ visibility: loading ? 'hidden' : 'visible' }}>
            <Content component="dt" data-testid="about-product-name">
              {dsciStatus?.release?.name ||
                (isRHOAI ? RhoaiDefaultReleaseName : OdhDefaultReleaseName)}{' '}
              version
            </Content>
            <Content component="dd" data-testid="about-version">
              {dsciStatus?.release?.version || 'Unknown'}
            </Content>
            <Content component="dt">Channel</Content>
            <Content component="dd" data-testid="about-channel">
              {subStatus?.channel || 'Unknown'}
            </Content>
            <Content component="dt">API server</Content>
            <Content component="dd" data-testid="about-server-url">
              {serverURL}
            </Content>
            <Content component="dt">User type</Content>
            <Content component="dd" data-testid="about-access-level">
              {isAdmin ? 'Administrator' : 'Non-administrator'}
            </Content>
            <Content component="dt">Last updated</Content>
            <Content component="dd" data-testid="about-last-update">
              {subStatus?.lastUpdated
                ? new Date(subStatus.lastUpdated).toLocaleString(undefined, {
                    dateStyle: 'long',
                  })
                : 'Unknown'}
            </Content>
          </Content>

          {/* Component Releases Section */}
          <Content
            style={{
              paddingTop: 48,
              visibility: loading ? 'hidden' : 'visible',
            }}
          >
            <h4>Installed components</h4>
            {groupedComponents.length > 0 ? (
              <Table aria-label="Component Releases Table" data-testid="component-releases-table">
                <Thead>
                  <Tr data-testid="table-row-title">
                    <Th modifier="wrap">
                      {isRHOAI ? RhoaiDefaultComponentReleaseName : OdhDefaultComponentReleaseName}{' '}
                      component
                    </Th>
                    <Th modifier="wrap">Upstream component</Th>
                    <Th modifier="wrap">Upstream version</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {groupedComponents.map(([displayName, details]) =>
                    details?.releases && details.releases.length > 0 ? (
                      details.releases.map((release, index) => (
                        <Tr key={`${displayName}-${index}`} data-testid="table-row-data">
                          {index === 0 ? (
                            <Td rowSpan={details.releases.length}>{displayName}</Td>
                          ) : null}
                          <Td
                            style={{
                              paddingInlineStart: 'var(--pf-v6-c-table--cell--Padding--base)',
                            }}
                          >
                            {release.repoUrl ? (
                              <ExternalLink text={release.name} to={release.repoUrl} />
                            ) : (
                              release.name
                            )}
                          </Td>
                          <Td>{release.version}</Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr key={displayName}>
                        <Td>{displayName}</Td>
                        <Td>-</Td>
                        <Td>-</Td>
                      </Tr>
                    ),
                  )}
                </Tbody>
              </Table>
            ) : (
              <p>No installed components</p>
            )}
          </Content>
        </div>
        {error ? (
          <Alert
            style={{ marginTop: 'var(--pf-t--global--spacer--lg)' }}
            variant="danger"
            title="Problem loading product information"
          >
            {error.message}
          </Alert>
        ) : null}
      </Content>
    </AboutModal>
  );
};

export default AboutDialog;
