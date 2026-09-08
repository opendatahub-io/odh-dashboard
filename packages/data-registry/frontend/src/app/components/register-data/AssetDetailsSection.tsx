import React from 'react';
import {
  FormGroup,
  FormSection,
  TextInput,
  TextArea,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  Content,
  Label,
  LabelGroup,
  Popover,
  Icon,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';
import OwnerField from './OwnerField';

const UNSTRUCTURED_FORMATS = [
  { key: 'documents', label: 'Documents', description: 'Text, PDFs, and office files' },
  { key: 'images', label: 'Images', description: 'Photos, graphics, and medical scans' },
  { key: 'audio', label: 'Audio', description: 'Speech, music, and sound recordings' },
  { key: 'video', label: 'Video', description: 'Clips, recordings, and video streams' },
  { key: 'binary', label: 'Binary', description: 'Models, code, and compressed archives' },
  { key: 'other', label: 'Other', description: 'Custom or uncategorized formats' },
];

const STRUCTURED_FORMATS = [
  { key: 'iceberg', label: 'Apache Iceberg', description: 'Iceberg table with metadata catalog' },
  { key: 'parquet', label: 'Parquet', description: 'Raw columnar data files' },
  { key: 'csv', label: 'CSV', description: 'Structured delimited text files' },
  { key: 'delta', label: 'Delta Lake', description: 'Delta table with transaction log' },
  { key: 'postgresql', label: 'PostgreSQL', description: 'Relational database table or view' },
  { key: 'other', label: 'Other', description: 'Custom or uncategorized formats' },
];

const DEFAULT_FORMATS: Record<string, string> = {
  unstructured: 'other',
  structured: 'iceberg',
};

type AssetDetailsSectionProps =
  | {
      isEditMode?: false;
      collections: string[];
      onManageCollections: () => void;
    }
  | {
      isEditMode: true;
      collections?: never;
      onManageCollections?: never;
    };

const AssetDetailsSection: React.FC<AssetDetailsSectionProps> = (props) => {
  const { isEditMode } = props;
  const {
    control,
    formState: { errors },
    setValue,
    getValues,
    watch,
  } = useFormContext<RegisterDataFormData | EditAssetFormData>();

  const assetType = watch('assetType');
  const labels = watch('labels');
  const [isAssetTypeOpen, setIsAssetTypeOpen] = React.useState(false);
  const [isFormatOpen, setIsFormatOpen] = React.useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [isAddingLabel, setIsAddingLabel] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');

  const formatOptions = assetType === 'structured' ? STRUCTURED_FORMATS : UNSTRUCTURED_FORMATS;

  const handleAddLabel = React.useCallback(() => {
    const trimmed = newLabel.trim();
    const currentLabels = getValues('labels');
    if (trimmed && !currentLabels.includes(trimmed)) {
      setValue('labels', [...currentLabels, trimmed]);
      setNewLabel('');
      setIsAddingLabel(false);
    }
  }, [newLabel, getValues, setValue]);

  const handleRemoveLabel = React.useCallback(
    (label: string) => {
      const currentLabels = getValues('labels');
      setValue(
        'labels',
        currentLabels.filter((l) => l !== label),
      );
    },
    [getValues, setValue],
  );

  return (
    <FormSection title={isEditMode ? 'Asset details' : 'Data asset details'} titleElement="h2">
      {isEditMode ? null : (
        <Content component="p">
          Provide general identification and classification details for this data asset.
        </Content>
      )}

      {isEditMode ? (
        <FormGroup label="Name" fieldId="data-name">
          <TextInput
            id="data-name"
            value={getValues('name')}
            readOnlyVariant="default"
            data-testid="data-name-input"
          />
        </FormGroup>
      ) : (
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <FormGroup label="Asset name" isRequired fieldId="data-name">
              <TextInput
                id="data-name"
                {...field}
                isRequired
                validated={errors.name ? 'error' : 'default'}
                data-testid="data-name-input"
              />
              {errors.name ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{errors.name.message}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          )}
        />
      )}

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <FormGroup label="Asset description" fieldId="data-description">
            <TextArea
              id="data-description"
              {...field}
              validated={errors.description ? 'error' : 'default'}
              data-testid="data-description-input"
            />
            {errors.description ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{errors.description.message}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
        )}
      />

      {isEditMode ? null : <OwnerField />}

      {isEditMode ? (
        <FormGroup label="Asset type" fieldId="asset-type">
          <TextInput
            id="asset-type"
            value={assetType === 'structured' ? 'Structured' : 'Unstructured'}
            readOnlyVariant="default"
            data-testid="asset-type-toggle"
          />
        </FormGroup>
      ) : (
        <Controller
          name="assetType"
          control={control}
          render={({ field }) => (
            <FormGroup
              label="Asset type"
              isRequired
              fieldId="asset-type"
              labelHelp={
                <Popover bodyContent="Unstructured assets are file-based volumes. Structured assets represent tabular data with defined columns and types.">
                  <Icon aria-label="Asset type info" role="button">
                    <OutlinedQuestionCircleIcon />
                  </Icon>
                </Popover>
              }
            >
              <Select
                isOpen={isAssetTypeOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  const newType = String(value);
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
                    value="unstructured"
                    description="File-based volumes (documents, images, audio, video)"
                    data-testid="asset-type-unstructured"
                  >
                    Unstructured
                  </SelectOption>
                  <SelectOption
                    value="structured"
                    description="Tabular data with defined columns and types"
                    data-testid="asset-type-structured"
                  >
                    Structured
                  </SelectOption>
                </SelectList>
              </Select>
            </FormGroup>
          )}
        />
      )}

      <Controller
        name="format"
        control={control}
        render={({ field }) => (
          <FormGroup
            label="Format"
            fieldId="data-format"
            labelHelp={
              assetType === 'structured' ? (
                <Popover bodyContent="The storage format determines how data is organized on disk.">
                  <Icon aria-label="Format info" role="button">
                    <OutlinedQuestionCircleIcon />
                  </Icon>
                </Popover>
              ) : undefined
            }
          >
            <Select
              isOpen={isFormatOpen}
              selected={field.value}
              onSelect={(_event, value) => {
                field.onChange(String(value));
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
                  {formatOptions.find((f) => f.key === field.value)?.label || 'Select format'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {formatOptions.map((option) => (
                  <SelectOption
                    key={option.key}
                    value={option.key}
                    description={option.description}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        )}
      />

      {isEditMode ? (
        <FormGroup label="Collection" fieldId="data-collection">
          <Content component="p">
            Assign this asset to collections to help group your data. To manage collections for the
            entire project, go to{' '}
            <Button variant="link" isInline isDisabled>
              Manage collections
            </Button>
            .
          </Content>
          <TextInput
            id="data-collection"
            value={getValues('collection')}
            readOnlyVariant="default"
            data-testid="data-collection-toggle"
          />
        </FormGroup>
      ) : (
        <Controller
          name="collection"
          control={control}
          render={({ field }) => (
            <FormGroup label="Collection" fieldId="data-collection">
              <Content component="p">
                Assign this asset to collections to help group your data. To manage collections for
                the entire project, go to{' '}
                <Button variant="link" isInline onClick={props.onManageCollections}>
                  Manage collections
                </Button>
                .
              </Content>
              <Select
                isOpen={isCollectionOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  if (value === '__create_new__') {
                    setIsCollectionOpen(false);
                    props.onManageCollections();
                    return;
                  }
                  field.onChange(String(value));
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
                  {props.collections.map((coll) => (
                    <SelectOption key={coll} value={coll}>
                      {coll}
                    </SelectOption>
                  ))}
                  <SelectOption key="__create_new__" value="__create_new__">
                    <Button variant="link" isInline icon={<PlusCircleIcon />}>
                      Create new collection
                    </Button>
                  </SelectOption>
                </SelectList>
              </Select>
              {errors.collection ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{errors.collection.message}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          )}
        />
      )}

      <FormGroup label="Labels" fieldId="data-labels">
        <Content component="p">
          Add labels to help organize and filter this asset. To manage labels for the entire
          project, go to{' '}
          <Button variant="link" isInline isDisabled>
            Manage labels
          </Button>
          .
        </Content>
        {labels.length > 0 ? (
          <LabelGroup numLabels={5}>
            {labels.map((label) => (
              <Label
                key={label}
                variant={isEditMode ? 'outline' : undefined}
                onClose={() => handleRemoveLabel(label)}
                closeBtnProps={{ 'data-testid': `data-label-remove-${label}` }}
                data-testid={`data-label-${label}`}
              >
                {label}
              </Label>
            ))}
          </LabelGroup>
        ) : null}
        {isAddingLabel ? (
          <TextInput
            id="data-labels-input"
            aria-label="New label name"
            value={newLabel}
            onChange={(_event, value) => setNewLabel(value)}
            placeholder="Enter label name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLabel();
              }
              if (e.key === 'Escape') {
                setIsAddingLabel(false);
                setNewLabel('');
              }
            }}
            onBlur={() => {
              if (newLabel.trim()) {
                handleAddLabel();
              } else {
                setIsAddingLabel(false);
              }
            }}
            autoFocus
            data-testid="data-labels-input"
          />
        ) : null}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => setIsAddingLabel(true)}
          data-testid="data-add-label-button"
        >
          Add label
        </Button>
      </FormGroup>
    </FormSection>
  );
};

export default AssetDetailsSection;
