import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardHeader,
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  FormSelect,
  FormSelectOption,
  PageSection,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import CodeBlockComponent from '~/app/shared/markdown/components/CodeBlockComponent';
import { ServingRuntime, ServingRuntimeVersion } from '~/odh/types/servingRuntimeCatalogTypes';
import { formatRuntimePublishedDate, formatRuntimeTemplate } from './runtimeCatalogDetailsUtils';

export type RuntimeCatalogDetailsViewProps = {
  breadcrumbs: { title: string; href: string }[];
  runtimeDetails?: ServingRuntime | null;
  runtimeVersions?: ServingRuntimeVersion[];
  loading?: boolean;
  error?: Error;
  notFound?: boolean;
};

const RuntimeCatalogDetailsView: React.FC<RuntimeCatalogDetailsViewProps> = ({
  breadcrumbs,
  runtimeDetails,
  runtimeVersions = [],
  loading = false,
  error,
  notFound = false,
}) => {
  const { runtimeId = '' } = useParams<{ runtimeId: string }>();
  const [selectedVersionId, setSelectedVersionId] = React.useState('');
  const selectedVersion =
    runtimeVersions.find((version) => (version.id || version.version) === selectedVersionId) ||
    (runtimeVersions.length > 0 ? runtimeVersions[0] : undefined);
  const runtimeNotFound = notFound || (!!runtimeDetails && runtimeId !== runtimeDetails.id);
  const modelFormats = (
    selectedVersion?.supportedModelFormats || runtimeDetails?.supportedModelFormats
  )
    ?.map(({ name }) => name)
    .join(', ');
  const publishedDate = formatRuntimePublishedDate(
    selectedVersion ? selectedVersion.publishedDate : runtimeDetails?.publishedDate,
  );
  const hardware = runtimeDetails?.capabilities?.supportedAccelerators?.join(', ');

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb>
          {breadcrumbs.map(({ title, href }) => (
            <BreadcrumbItem key={href} render={() => <Link to={href}>{title}</Link>} />
          ))}
          <BreadcrumbItem isActive>
            {runtimeNotFound
              ? runtimeId
              : runtimeDetails?.displayName || runtimeDetails?.name || runtimeId}
          </BreadcrumbItem>
        </Breadcrumb>
      </PageSection>
      <PageSection hasBodyWrapper={false} data-testid="runtime-catalog-details">
        {error ? (
          <Alert variant="danger" title="Unable to load runtime image" isInline>
            {error.message}
          </Alert>
        ) : loading ? (
          <Spinner aria-label="Loading runtime image" />
        ) : runtimeNotFound || !runtimeDetails ? (
          <EmptyState headingLevel="h1" icon={CubesIcon} titleText="Runtime image not found">
            <EmptyStateBody>The selected runtime image is not available.</EmptyStateBody>
          </EmptyState>
        ) : (
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h1" size="2xl">
                {runtimeDetails.displayName || runtimeDetails.name || runtimeId}
              </Title>
            </StackItem>
            {runtimeVersions.length > 0 ? (
              <StackItem>
                <FormSelect
                  aria-label="Runtime version"
                  data-testid="runtime-version-select"
                  value={selectedVersion?.id || selectedVersion?.version || ''}
                  onChange={(_event, value) => setSelectedVersionId(value)}
                >
                  {runtimeVersions.map((version) => (
                    <FormSelectOption
                      key={version.id || version.version}
                      value={version.id || version.version}
                      label={version.version}
                    />
                  ))}
                </FormSelect>
              </StackItem>
            ) : null}
            <StackItem>
              <Sidebar hasGutter isPanelRight>
                <SidebarContent>
                  <Stack hasGutter>
                    <StackItem>
                      <Card>
                        <CardHeader>
                          <Title headingLevel="h2" size="lg">
                            Description
                          </Title>
                        </CardHeader>
                        <CardBody>{runtimeDetails.description || 'N/A'}</CardBody>
                      </Card>
                    </StackItem>
                    {selectedVersion?.template ? (
                      <StackItem>
                        <Card>
                          <CardHeader>
                            <Title headingLevel="h2" size="lg">
                              Available configurations
                            </Title>
                          </CardHeader>
                          <CardBody>
                            <Tabs activeKey="serving-runtime" aria-label="Runtime configurations">
                              <Tab
                                eventKey="serving-runtime"
                                data-testid="runtime-serving-runtime-tab"
                                title={<TabTitleText>Serving runtime template</TabTitleText>}
                              >
                                <Stack
                                  hasGutter
                                  className="pf-v6-u-mt-md"
                                  data-testid="runtime-serving-runtime-panel"
                                >
                                  <StackItem>
                                    <Title headingLevel="h3" size="md">
                                      Serving runtime template
                                    </Title>
                                  </StackItem>
                                  <StackItem>
                                    Use this configuration for model serving. It appears under
                                    Serving runtime templates and in the model deployment wizard.
                                  </StackItem>
                                  <StackItem>
                                    <CodeBlockComponent copyTestId="runtime-serving-runtime-copy">
                                      {formatRuntimeTemplate(selectedVersion.template)}
                                    </CodeBlockComponent>
                                  </StackItem>
                                </Stack>
                              </Tab>
                            </Tabs>
                          </CardBody>
                        </Card>
                      </StackItem>
                    ) : null}
                  </Stack>
                </SidebarContent>
                <SidebarPanel width={{ default: 'width_33' }}>
                  <Card>
                    <CardHeader>
                      <Title headingLevel="h2" size="lg">
                        Details
                      </Title>
                    </CardHeader>
                    <CardBody>
                      <DescriptionList>
                        {[
                          ['Version', selectedVersion?.version],
                          ['Hardware', hardware],
                          ['Model formats', modelFormats],
                          ['Container image', selectedVersion?.image],
                          ['Certified platform', undefined],
                          ['Publish on', publishedDate],
                        ].map(([label, value]) => (
                          <DescriptionListGroup key={label}>
                            <DescriptionListTerm>{label}</DescriptionListTerm>
                            <DescriptionListDescription>
                              {label === 'Container image' && value ? (
                                <ClipboardCopy
                                  isReadOnly
                                  copyAriaLabel="Copy container image"
                                  data-testid="runtime-container-image-copy"
                                >
                                  {value}
                                </ClipboardCopy>
                              ) : (
                                value || 'N/A'
                              )}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        ))}
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </SidebarPanel>
              </Sidebar>
            </StackItem>
          </Stack>
        )}
      </PageSection>
    </>
  );
};

export default RuntimeCatalogDetailsView;
