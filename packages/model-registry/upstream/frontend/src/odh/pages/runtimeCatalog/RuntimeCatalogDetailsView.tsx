import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
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
  Flex,
  FlexItem,
  Label,
  LabelGroup,
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
import { formatRuntimePublishedDate, formatRuntimeTemplate } from './runtimeCatalogDetailsUtils';
import {
  RuntimeDetails,
  RuntimeDisplayDetails,
  sampleRuntimeDetails,
  sampleRuntimeDisplayDetails,
} from './runtimeCatalogMock';
import './RuntimeCatalogDetailsView.scss';

export type RuntimeCatalogDetailsViewProps = {
  breadcrumbs: { title: string; href: string }[];
  runtimeDetails?: RuntimeDetails;
  displayDetails?: RuntimeDisplayDetails;
  loading?: boolean;
  error?: Error;
  notFound?: boolean;
};

const RuntimeCatalogDetailsView: React.FC<RuntimeCatalogDetailsViewProps> = ({
  breadcrumbs,
  runtimeDetails = sampleRuntimeDetails,
  displayDetails,
  loading = false,
  error,
  notFound = false,
}) => {
  const { runtimeName = '' } = useParams<{ runtimeName: string }>();
  const [activeTab, setActiveTab] = React.useState<string | number>('serving-runtime');
  const runtimeNotFound = notFound || runtimeName !== runtimeDetails.id;
  const isSample = runtimeDetails === sampleRuntimeDetails;
  const resolvedDisplayDetails =
    displayDetails ?? (isSample ? sampleRuntimeDisplayDetails : undefined);
  const certifiedPlatforms =
    resolvedDisplayDetails?.certifiedPlatform
      .split(',')
      .map((platform) => platform.trim())
      .filter((platform) => Boolean(platform) && platform !== 'N/A') ?? [];
  const modelFormats = runtimeDetails.supportedModelFormats?.map(({ name }) => name).join(', ');
  const publishedDate = formatRuntimePublishedDate(runtimeDetails.publishedDate);

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb>
          {breadcrumbs.map(({ title, href }) => (
            <BreadcrumbItem key={href} render={() => <Link to={href}>{title}</Link>} />
          ))}
          <BreadcrumbItem isActive>
            {runtimeNotFound ? runtimeName : runtimeDetails.name}
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
        ) : runtimeNotFound ? (
          <EmptyState headingLevel="h1" icon={CubesIcon} titleText="Runtime image not found">
            <EmptyStateBody>The selected runtime image is not available.</EmptyStateBody>
          </EmptyState>
        ) : (
          <Stack hasGutter>
            <StackItem>
              <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                <FlexItem>
                  <Title headingLevel="h1" size="2xl">
                    {runtimeDetails.name}
                  </Title>
                </FlexItem>
                <FlexItem>
                  <Button variant="primary" isDisabled>
                    Create
                  </Button>
                </FlexItem>
              </Flex>
            </StackItem>
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
                        <CardBody>{runtimeDetails.description}</CardBody>
                      </Card>
                    </StackItem>
                    <StackItem>
                      <Card>
                        <CardHeader>
                          <Title headingLevel="h2" size="lg">
                            Available configurations
                          </Title>
                        </CardHeader>
                        <CardBody>
                          <Tabs
                            activeKey={activeTab}
                            onSelect={(_event, tabKey) => setActiveTab(tabKey)}
                            aria-label="Runtime configurations"
                          >
                            <Tab
                              eventKey="serving-runtime"
                              title={<TabTitleText>Serving runtime template</TabTitleText>}
                            >
                              <Stack hasGutter className="pf-v6-u-mt-md">
                                <StackItem>
                                  <Title headingLevel="h3" size="md">
                                    Serving runtime template
                                  </Title>
                                </StackItem>
                                <StackItem>
                                  Use this configuration for model serving. It appears under Serving
                                  runtime templates and in the model deployment wizard.
                                </StackItem>
                                <StackItem>
                                  <CodeBlockComponent>
                                    {formatRuntimeTemplate(
                                      runtimeDetails.servingRuntimeTemplate,
                                      isSample,
                                    )}
                                  </CodeBlockComponent>
                                </StackItem>
                              </Stack>
                            </Tab>
                            <Tab
                              eventKey="llm-accelerator"
                              title={<TabTitleText>LLM accelerator configuration</TabTitleText>}
                            >
                              <Stack hasGutter className="pf-v6-u-mt-md">
                                <StackItem>
                                  <Title headingLevel="h3" size="md">
                                    LLM accelerator configuration
                                  </Title>
                                </StackItem>
                                <StackItem>
                                  Use this configuration for LLM inference services. It appears
                                  under LLM accelerator configurations and in the LLM inference
                                  service deployment wizard.
                                </StackItem>
                                <StackItem>
                                  <CodeBlockComponent>
                                    {formatRuntimeTemplate(
                                      runtimeDetails.llmInferenceServiceTemplate,
                                      isSample,
                                    )}
                                  </CodeBlockComponent>
                                </StackItem>
                              </Stack>
                            </Tab>
                          </Tabs>
                        </CardBody>
                      </Card>
                    </StackItem>
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
                          ['Version', runtimeDetails.version],
                          ['Hardware', resolvedDisplayDetails?.hardware],
                          ['Model formats', modelFormats],
                          ['Container image', runtimeDetails.image],
                          ['Certified platform', resolvedDisplayDetails?.certifiedPlatform],
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
                              ) : label === 'Certified platform' ? (
                                certifiedPlatforms.length > 0 ? (
                                  <LabelGroup numLabels={certifiedPlatforms.length}>
                                    {certifiedPlatforms.map((platform) => (
                                      <Label
                                        key={platform}
                                        variant="outline"
                                        className="odh-runtime-catalog-certified-platform"
                                        data-testid="runtime-certified-platform-label"
                                      >
                                        {platform}
                                      </Label>
                                    ))}
                                  </LabelGroup>
                                ) : (
                                  'N/A'
                                )
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
