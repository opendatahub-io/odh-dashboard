import * as React from 'react';
import {
  ActionGroup,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Form,
  FormGroup,
  MenuToggle,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  TextArea,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router';
import { useFetchState, FetchStateCallbackPromise, NotReadyError } from 'mod-arch-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { getCollection } from '~/app/api/k8s';
import { evaluationsBaseRoute, evaluationCollectionsRoute } from '~/app/routes';
import { useProviders } from '~/app/hooks/useProviders';
import { formatCategory } from '~/app/components/benchmarkUtils';
import FormGroupLabel from '~/app/components/FormGroupLabel';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import WeightDistributionBar from '~/app/components/WeightDistributionBar';
import BenchmarkConfigAccordion from '~/app/components/BenchmarkConfigAccordion';
import AddBenchmarkModal from '~/app/components/AddBenchmarkModal';
import type { Collection } from '~/app/types';
import { useCopySuiteForm, MAX_BENCHMARKS, type CopySuiteBenchmark } from './useCopySuiteForm';

import './CopySuitePage.scss';

const CopySuitePage: React.FC = () => {
  const { namespace, collectionId } = useParams<{
    namespace: string;
    collectionId: string;
  }>();

  // ── Fetch source collection ────────────────────────────────────────

  const fetchCollection = React.useCallback<FetchStateCallbackPromise<Collection>>(
    (opts) => {
      if (!namespace || !collectionId) {
        return Promise.reject(new NotReadyError('Missing namespace or collection ID'));
      }
      return getCollection('', namespace, collectionId)(opts);
    },
    [namespace, collectionId],
  );

  const [sourceCollection, loaded, loadError] = useFetchState<Collection | undefined>(
    fetchCollection,
    undefined,
    { initialPromisePurity: true },
  );

  const { providers, loaded: providersLoaded } = useProviders(namespace ?? '');

  const form = useCopySuiteForm({
    namespace,
    sourceCollection,
    providers,
    providersLoaded,
  });

  // ── Category dropdown ──────────────────────────────────────────────

  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);

  const availableCategories = React.useMemo(() => {
    const cats = new Set<string>();
    if (sourceCollection?.category) {
      cats.add(sourceCollection.category);
    }
    if (form.suiteCategory && form.suiteCategory !== sourceCollection?.category) {
      cats.add(form.suiteCategory);
    }
    return [...cats];
  }, [sourceCollection, form.suiteCategory]);

  // ── Add benchmarks modal ──────────────────────────────────────────

  const [isAddBenchmarkOpen, setIsAddBenchmarkOpen] = React.useState(false);

  const existingBenchmarkIds = React.useMemo(
    () => new Set(form.benchmarks.map((b) => `${b.providerId}:${b.id}`)),
    [form.benchmarks],
  );

  const handleAddBenchmarks = React.useCallback(
    (newBenchmarks: CopySuiteBenchmark[]) => {
      form.addBenchmarks(newBenchmarks);
      setIsAddBenchmarkOpen(false);
    },
    [form],
  );

  // ── Loading & error states ─────────────────────────────────────────

  if (!loaded || !providersLoaded) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading benchmark suite" />
      </Bullseye>
    );
  }

  if (loadError || !sourceCollection) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to load collection"
          status="danger"
          data-testid="copy-suite-load-error"
        >
          <EmptyStateBody>
            {loadError?.message ?? 'The requested collection could not be found.'}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                component={(props) => (
                  <Link {...props} to={evaluationCollectionsRoute(namespace)} />
                )}
              >
                Return to benchmark suites
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      noHeader
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem
            render={() => (
              <Link to={evaluationCollectionsRoute(namespace)}>
                {sourceCollection.category
                  ? `${formatCategory(sourceCollection.category)} benchmark suites`
                  : 'Benchmark suites'}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>Copy suite</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Content component="h1" data-testid="app-page-title" className="pf-v6-u-mt-0 pf-v6-u-mb-0">
          Copy suite
        </Content>
        <Content component="p" data-testid="copy-suite-description">
          Customize benchmarks, thresholds, and metrics before adding this suite to your dashboard.
        </Content>

        <Form style={{ maxWidth: 700 }} data-testid="copy-suite-form">
          {/* ── Suite name ─────────────────────────────────────── */}
          <FormGroup label="Suite name" isRequired fieldId="suite-name">
            <TextInput
              id="suite-name"
              data-testid="suite-name-input"
              value={form.suiteName}
              onChange={(_e, val) => form.setSuiteName(val)}
              isRequired
            />
          </FormGroup>

          {/* ── Description ────────────────────────────────────── */}
          <FormGroup label="Description" fieldId="suite-description">
            <TextArea
              id="suite-description"
              data-testid="suite-description-input"
              value={form.suiteDescription}
              onChange={(_e, val) => form.setSuiteDescription(val)}
              resizeOrientation="vertical"
            />
          </FormGroup>

          {/* ── Category ───────────────────────────────────────── */}
          <FormGroup label="Category" fieldId="suite-category">
            <Select
              id="suite-category-menu"
              data-testid="suite-category-select"
              isOpen={isCategoryOpen}
              selected={form.suiteCategory}
              onSelect={(_event, value) => {
                if (typeof value === 'string') {
                  form.setSuiteCategory(value);
                }
                setIsCategoryOpen(false);
              }}
              onOpenChange={setIsCategoryOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  id="suite-category"
                  ref={toggleRef}
                  onClick={() => setIsCategoryOpen((prev) => !prev)}
                  isExpanded={isCategoryOpen}
                  isFullWidth
                  data-testid="suite-category-toggle"
                >
                  {form.suiteCategory ? formatCategory(form.suiteCategory) : 'Select category'}
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {availableCategories.map((cat) => (
                  <SelectOption key={cat} value={cat} isSelected={form.suiteCategory === cat}>
                    {formatCategory(cat)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          {/* ── Suite threshold ────────────────────────────────── */}
          <BenchmarkThresholdField
            value={form.suiteThreshold}
            onChange={form.handleSuiteThresholdChange}
            label="Suite threshold"
            description="Set the minimum passing score for this suite. Results below this threshold are marked as failing."
            fieldId="suite-threshold"
          />

          {/* ── Weight distribution ────────────────────────────── */}
          {form.benchmarks.length > 1 && (
            <FormGroup
              className="evalhub-form-group--with-description"
              label={
                <FormGroupLabel
                  label="Overall suite result weights"
                  description="Drag dividers to adjust how much each benchmark contributes to the overall suite score."
                />
              }
              fieldId="weight-distribution"
            >
              <WeightDistributionBar
                segments={form.weightSegments}
                onWeightsChange={form.handleWeightsChange}
              />
            </FormGroup>
          )}

          {/* ── Benchmarks ─────────────────────────────────────── */}
          <Card
            className="evalhub-copy-suite-page__benchmarks-card"
            data-testid="benchmarks-section"
          >
            <CardTitle>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                style={{ width: '100%' }}
              >
                <FlexItem>Benchmarks</FlexItem>
                <FlexItem>
                  <Tooltip
                    content={`You have reached the maximum of ${MAX_BENCHMARKS} benchmarks. Remove a benchmark before adding another.`}
                    trigger={form.benchmarks.length >= MAX_BENCHMARKS ? undefined : 'manual'}
                  >
                    <Button
                      variant="secondary"
                      data-testid="add-benchmarks-button"
                      onClick={() => {
                        if (form.benchmarks.length < MAX_BENCHMARKS) {
                          setIsAddBenchmarkOpen(true);
                        }
                      }}
                      isAriaDisabled={form.benchmarks.length >= MAX_BENCHMARKS}
                    >
                      Add benchmarks
                    </Button>
                  </Tooltip>
                </FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <Content component="p" className="evalhub-copy-suite-page__benchmarks-description">
                Choose the primary metric, number of samples, random seed, and threshold used to
                calculate the result for each benchmark.
              </Content>
              <BenchmarkConfigAccordion
                benchmarks={form.benchmarks}
                onUpdate={form.updateBenchmark}
                onRemove={form.removeBenchmark}
                canRemove={form.benchmarks.length > 1}
              />
            </CardBody>
          </Card>

          {/* ── Footer actions ─────────────────────────────────── */}
          <ActionGroup className="evalhub-copy-suite-page__footer">
            <Button
              variant="primary"
              data-testid="copy-suite-save-and-run"
              onClick={form.handleSaveAndRun}
              isDisabled={!form.isValid || form.isSubmitting}
              isLoading={form.isSubmitting}
            >
              Save and run
            </Button>
            <Button
              variant="secondary"
              data-testid="copy-suite-save-only"
              onClick={form.handleSaveOnly}
              isDisabled={!form.isValid || form.isSubmitting}
            >
              Add to my benchmark suites
            </Button>
            <Button variant="link" data-testid="copy-suite-cancel" onClick={form.handleCancel}>
              Cancel
            </Button>
          </ActionGroup>
        </Form>
      </PageSection>

      {isAddBenchmarkOpen && (
        <AddBenchmarkModal
          providers={providers}
          existingBenchmarkIds={existingBenchmarkIds}
          maxNewBenchmarks={MAX_BENCHMARKS - form.benchmarks.length}
          onAdd={handleAddBenchmarks}
          onClose={() => setIsAddBenchmarkOpen(false)}
        />
      )}
    </ApplicationsPage>
  );
};

export default CopySuitePage;
