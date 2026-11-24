import React from 'react';
import {
  Button,
  Content,
  FormGroup,
  FormGroupLabelHelp,
  FormHelperText,
  FormSection,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Popover,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { Controller, useFormContext } from 'react-hook-form';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { useLabels } from '~/app/hooks/useLabels';
import { useDataRegistryTrackEvent } from '~/app/hooks/useDataRegistryTrackEvent';
import { DATA_REGISTRY_EVENT_NAMES } from '~/app/utilities/tracking';
import {
  DEFAULT_FORMATS,
  STRUCTURED_FORMAT_OPTIONS,
  UNSTRUCTURED_FORMAT_OPTIONS,
} from '~/app/utilities/formatUtils';
import styles from './RegistrationForm.module.scss';

type AssetFormData = RegisterDataFormData | EditAssetFormData;

type EditModeProps = {
  isEditMode?: boolean;
  project?: string;
};

export const toResourceName = (value: string): string => {
  if (!value.trim()) {
    return '';
  }
  const generated = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
  return generated || 'data-asset';
};

export const RegistrationIdentitySection: React.FC<EditModeProps> = ({
  isEditMode = false,
  project,
}) => {
  const form = useFormContext<AssetFormData>();
  const [isEditingResourceName, setIsEditingResourceName] = React.useState(false);

  return (
    <FormSection title="Data asset details" titleElement="h2">
      {!isEditMode ? (
        <FormGroup label="Project" isRequired fieldId="data-project">
          <TextInput
            id="data-project"
            value={project ?? ''}
            readOnlyVariant="default"
            data-testid="data-project-input"
          />
        </FormGroup>
      ) : null}

      <FormGroup label="Data asset name" isRequired fieldId="data-name">
        <Controller
          name="displayName"
          control={form.control}
          render={({ field }) => (
            <TextInput
              id="data-name"
              {...field}
              isRequired
              validated={form.formState.errors.displayName ? 'error' : 'default'}
              data-testid="data-name-input"
              onChange={(_event, value) => {
                field.onChange(value);
                if (!isEditMode && !isEditingResourceName) {
                  form.setValue('name', toResourceName(value), { shouldValidate: true });
                }
              }}
            />
          )}
        />
        {form.formState.errors.displayName ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">
                {form.formState.errors.displayName.message}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>

      {isEditMode ? (
        <FormGroup label="Resource name" fieldId="data-resource-name">
          <TextInput
            id="data-resource-name"
            value={form.getValues('name')}
            readOnlyVariant="default"
            data-testid="data-resource-name-input"
          />
        </FormGroup>
      ) : null}

      {!isEditMode ? (
        isEditingResourceName ? (
          <Controller
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormGroup label="Resource name" isRequired fieldId="data-resource-name">
                <TextInput
                  id="data-resource-name"
                  {...field}
                  isRequired
                  validated={form.formState.errors.name ? 'error' : 'default'}
                  data-testid="data-resource-name-input"
                />
                <HelperText>
                  <HelperTextItem>Cannot exceed 30 characters.</HelperTextItem>
                  <HelperTextItem>
                    Must start and end with a letter or number. Valid characters include lowercase
                    letters, numbers, and hyphens (-).
                  </HelperTextItem>
                  {form.formState.errors.name ? (
                    <HelperTextItem variant="error">
                      {form.formState.errors.name.message}
                    </HelperTextItem>
                  ) : null}
                  <HelperTextItem>
                    <Button
                      variant="link"
                      isInline
                      onClick={() => {
                        form.setValue('name', toResourceName(form.getValues('displayName')));
                        setIsEditingResourceName(false);
                      }}
                    >
                      Hide resource name
                    </Button>
                  </HelperTextItem>
                </HelperText>
              </FormGroup>
            )}
          />
        ) : (
          <HelperText>
            <HelperTextItem>
              The resource name will be <b>{form.watch('name')}</b>.
            </HelperTextItem>
            <HelperTextItem>
              <Button
                variant="link"
                isInline
                onClick={() => setIsEditingResourceName(true)}
                data-testid="data-edit-resource-name"
              >
                Edit resource name
              </Button>
            </HelperTextItem>
          </HelperText>
        )
      ) : null}

      <Controller
        name="description"
        control={form.control}
        render={({ field }) => (
          <FormGroup label="Description" fieldId="data-description">
            <TextArea
              id="data-description"
              {...field}
              validated={form.formState.errors.description ? 'error' : 'default'}
              data-testid="data-description-input"
            />
            {form.formState.errors.description ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">
                    {form.formState.errors.description.message}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
        )}
      />
    </FormSection>
  );
};

export const RegistrationAssetFormatSection: React.FC<EditModeProps> = ({
  isEditMode = false,
  project,
}) => {
  const { control, setValue, watch } = useFormContext<AssetFormData>();
  const trackEvent = useDataRegistryTrackEvent();
  const assetType = watch('assetType');
  const [isAssetTypeOpen, setIsAssetTypeOpen] = React.useState(false);
  const [isFormatOpen, setIsFormatOpen] = React.useState(false);
  const formatOptions =
    assetType === 'structured' ? STRUCTURED_FORMAT_OPTIONS : UNSTRUCTURED_FORMAT_OPTIONS;

  return (
    <FormSection title="Data asset format" titleElement="h2" className={styles.assetFormatSection}>
      <Content component="p">
        Specify the data’s format and whether it is structured or unstructured.
      </Content>

      <FormGroup
        label="Asset type"
        isRequired={!isEditMode}
        fieldId="asset-type"
        labelHelp={
          isEditMode ? undefined : (
            <Popover bodyContent="Structured formats such as iceberg, parquet, and SQL databases have a defined schema. Unstructured formats such as PDFs and images represent raw data.">
              <FormGroupLabelHelp aria-label="Asset type info" />
            </Popover>
          )
        }
      >
        {isEditMode ? (
          <TextInput
            id="asset-type"
            value={assetType === 'structured' ? 'Structured' : 'Unstructured'}
            readOnlyVariant="default"
            data-testid="asset-type-toggle"
          />
        ) : (
          <Controller
            name="assetType"
            control={control}
            render={({ field }) => (
              <Select
                isOpen={isAssetTypeOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  const newType = String(value);
                  if (
                    project &&
                    newType !== field.value &&
                    (newType === 'structured' || newType === 'unstructured')
                  ) {
                    trackEvent({
                      eventName: DATA_REGISTRY_EVENT_NAMES.assetTypeSelected,
                      properties: { assetType: newType, project },
                    });
                  }
                  field.onChange(newType);
                  setValue('format', DEFAULT_FORMATS[newType]);
                  setValue('schemaFields', []);
                  setIsAssetTypeOpen(false);
                }}
                onOpenChange={setIsAssetTypeOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsAssetTypeOpen((prev) => !prev)}
                    isExpanded={isAssetTypeOpen}
                    isFullWidth
                    data-testid="asset-type-toggle"
                  >
                    {field.value === 'structured' ? 'Structured' : 'Unstructured'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption
                    value="structured"
                    description="Tabular data with defined columns and types"
                    data-testid="asset-type-structured"
                  >
                    Structured
                  </SelectOption>
                  <SelectOption
                    value="unstructured"
                    description="File-based volumes (documents, images, audio, video)"
                    data-testid="asset-type-unstructured"
                  >
                    Unstructured
                  </SelectOption>
                </SelectList>
              </Select>
            )}
          />
        )}
      </FormGroup>

      <Controller
        name="format"
        control={control}
        render={({ field }) => (
          <FormGroup label="Format" fieldId="data-format" className={styles.formatGroup}>
            <Select
              isOpen={isFormatOpen}
              selected={field.value}
              onSelect={(_event, value) => {
                const newFormat = String(value);
                if (!isEditMode && project && newFormat !== field.value) {
                  trackEvent({
                    eventName: DATA_REGISTRY_EVENT_NAMES.formatSelected,
                    properties: { format: newFormat, project },
                  });
                }
                field.onChange(newFormat);
                setIsFormatOpen(false);
              }}
              onOpenChange={setIsFormatOpen}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsFormatOpen((prev) => !prev)}
                  isExpanded={isFormatOpen}
                  isFullWidth
                  data-testid="data-format-toggle"
                >
                  {formatOptions.find((format) => format.key === field.value)?.label ||
                    (isEditMode ? field.value : 'Select format')}
                </MenuToggle>
              )}
            >
              <SelectList>
                {isEditMode && !formatOptions.some((format) => format.key === field.value) ? (
                  <SelectOption value={field.value}>{field.value}</SelectOption>
                ) : null}
                {formatOptions.map((option) => (
                  <SelectOption
                    key={option.key}
                    value={option.key}
                    data-testid={`data-format-option-${option.key}`}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        )}
      />
    </FormSection>
  );
};

type RegistrationOrganizationSectionProps = EditModeProps & {
  project: string;
  collections?: string[];
  onManageCollections?: () => void;
  onManageLabels?: () => void;
};

export const RegistrationOrganizationSection: React.FC<RegistrationOrganizationSectionProps> = ({
  project,
  collections = [],
  isEditMode = false,
  onManageCollections,
  onManageLabels,
}) => {
  const {
    control,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useFormContext<AssetFormData>();
  const [availableLabels] = useLabels(project);
  const trackEvent = useDataRegistryTrackEvent();
  const labels = watch('labels');
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [createdLabels, setCreatedLabels] = React.useState<string[]>([]);
  const labelIdsRef = React.useRef<string[]>([]);
  const nextLabelIdRef = React.useRef(0);
  const initialLabelsRef = React.useRef(labels.filter(Boolean));

  while (labelIdsRef.current.length < labels.length) {
    labelIdsRef.current.push(`label-${nextLabelIdRef.current}`);
    nextLabelIdRef.current += 1;
  }
  if (labelIdsRef.current.length > labels.length) {
    labelIdsRef.current.length = labels.length;
  }

  const labelOptions = React.useMemo<TypeaheadSelectOption[]>(
    () =>
      [...new Set([...availableLabels, ...initialLabelsRef.current, ...createdLabels])].map(
        (label) => ({
          value: label,
          content: label,
        }),
      ),
    [availableLabels, createdLabels],
  );

  const handleAddLabel = React.useCallback(() => {
    labelIdsRef.current.push(`label-${nextLabelIdRef.current}`);
    nextLabelIdRef.current += 1;
    setValue('labels', [...getValues('labels'), '']);
  }, [getValues, setValue]);

  const handleRemoveLabel = React.useCallback(
    (index: number) => {
      labelIdsRef.current.splice(index, 1);
      const currentLabels = getValues('labels');
      setValue(
        'labels',
        currentLabels.filter((_label, currentIndex) => currentIndex !== index),
      );
    },
    [getValues, setValue],
  );

  return (
    <FormSection title="Organization" titleElement="h2" className={styles.organizationSection}>
      <Content component="p">
        Optionally organize and annotate this data asset so it is easier to find later.
      </Content>

      <FormGroup
        label="Collection"
        isRequired
        fieldId="data-collection"
        isStack
        className={styles.describedGroup}
      >
        <Content component="p">
          Organize this data into a collection.{' '}
          <Button
            variant="link"
            isInline
            isDisabled={!onManageCollections}
            onClick={onManageCollections}
          >
            Manage collections
          </Button>
        </Content>
        {isEditMode ? (
          <TextInput
            id="data-collection"
            value={getValues('collection')}
            readOnlyVariant="default"
            data-testid="data-collection-toggle"
          />
        ) : (
          <Controller
            name="collection"
            control={control}
            render={({ field }) => (
              <Select
                isOpen={isCollectionOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  if (value === '__create_new__') {
                    setIsCollectionOpen(false);
                    onManageCollections?.();
                    return;
                  }
                  const newCollection = String(value);
                  if (newCollection !== field.value) {
                    trackEvent({
                      eventName: DATA_REGISTRY_EVENT_NAMES.collectionSelectionChanged,
                      properties: {
                        initialCollection: 'none',
                        selectedCollection: newCollection === 'default' ? 'default' : 'custom',
                        project,
                      },
                    });
                  }
                  field.onChange(newCollection);
                  setIsCollectionOpen(false);
                }}
                onOpenChange={setIsCollectionOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsCollectionOpen((prev) => !prev)}
                    isExpanded={isCollectionOpen}
                    isFullWidth
                    data-testid="data-collection-toggle"
                  >
                    {field.value || 'Select collection'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {collections.map((collection) => (
                    <SelectOption key={collection} value={collection}>
                      {collection}
                    </SelectOption>
                  ))}
                  <SelectOption key="__create_new__" value="__create_new__">
                    <Button variant="link" isInline icon={<PlusCircleIcon />}>
                      Create new collection
                    </Button>
                  </SelectOption>
                </SelectList>
              </Select>
            )}
          />
        )}
        {errors.collection && !isEditMode ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">{errors.collection.message}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>

      <FormGroup label="Labels" fieldId="data-labels" isStack className={styles.describedGroup}>
        <Content component="p">
          Optionally add labels to this data asset to make it easier to find later.{' '}
          <Button variant="link" isInline isDisabled={!onManageLabels} onClick={onManageLabels}>
            Manage labels
          </Button>
          .
        </Content>
        {labels.map((label, index) => (
          <Flex
            key={labelIdsRef.current[index]}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            className="pf-v6-u-mb-xs"
          >
            <FlexItem grow={{ default: 'grow' }}>
              <TypeaheadSelect
                selectOptions={labelOptions}
                selected={label}
                isCreatable
                isRequired={false}
                placeholder="e.g. gold, team a"
                createOptionMessage={(newValue) => `Create "${newValue}"`}
                maxMenuHeight="20rem"
                onSelect={(_event, value) => {
                  const selectedLabel = String(value);
                  const currentLabels = getValues('labels');
                  const isDuplicate = currentLabels.some(
                    (currentLabel, currentIndex) =>
                      currentIndex !== index &&
                      currentLabel.trim().toLocaleLowerCase() ===
                        selectedLabel.trim().toLocaleLowerCase(),
                  );
                  if (
                    !isEditMode &&
                    selectedLabel.trim() &&
                    selectedLabel !== currentLabels[index] &&
                    !isDuplicate
                  ) {
                    trackEvent({
                      eventName: DATA_REGISTRY_EVENT_NAMES.labelAdded,
                      properties: { project },
                    });
                  }
                  if (!labelOptions.some((option) => option.value === selectedLabel)) {
                    setCreatedLabels((existingCreatedLabels) =>
                      existingCreatedLabels.includes(selectedLabel)
                        ? existingCreatedLabels
                        : [...existingCreatedLabels, selectedLabel],
                    );
                  }
                  setValue(
                    'labels',
                    currentLabels.map((currentLabel, currentIndex) =>
                      currentIndex === index ? selectedLabel : currentLabel,
                    ),
                  );
                }}
                dataTestId={`data-labels-input-${index}`}
                toggleProps={{ 'aria-label': `Label ${index + 1}` }}
              />
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                aria-label={`Remove label ${index + 1}`}
                onClick={() => handleRemoveLabel(index)}
                data-testid={`data-label-remove-${index}`}
              >
                <MinusCircleIcon />
              </Button>
            </FlexItem>
          </Flex>
        ))}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={handleAddLabel}
          className={styles.addLabel}
          data-testid="data-add-label-button"
        >
          Add label
        </Button>
      </FormGroup>
    </FormSection>
  );
};
