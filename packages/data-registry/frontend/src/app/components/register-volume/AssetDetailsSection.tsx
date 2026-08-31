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
import { RegisterVolumeFormData } from '~/app/schemas/registerVolume.schema';

const FORMAT_OPTIONS = [
  { key: 'documents', label: 'Documents', description: 'Text, PDFs, and office files' },
  { key: 'images', label: 'Images', description: 'Photos, graphics, and medical scans' },
  { key: 'audio', label: 'Audio', description: 'Speech, music, and sound recordings' },
  { key: 'video', label: 'Video', description: 'Clips, recordings, and video streams' },
  { key: 'binary', label: 'Binary', description: 'Models, code, and compressed archives' },
  { key: 'other', label: 'Other', description: 'Custom or uncategorized formats' },
];

type AssetDetailsSectionProps = {
  collections: string[];
  onManageCollections: () => void;
};

const AssetDetailsSection: React.FC<AssetDetailsSectionProps> = ({
  collections,
  onManageCollections,
}) => {
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<RegisterVolumeFormData>();

  const labels = watch('labels');
  const [isFormatOpen, setIsFormatOpen] = React.useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [isAddingLabel, setIsAddingLabel] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');

  const handleAddLabel = React.useCallback(() => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setValue('labels', [...labels, newLabel.trim()]);
      setNewLabel('');
      setIsAddingLabel(false);
    }
  }, [newLabel, labels, setValue]);

  const handleRemoveLabel = React.useCallback(
    (label: string) => {
      setValue(
        'labels',
        labels.filter((l) => l !== label),
      );
    },
    [labels, setValue],
  );

  return (
    <FormSection title="Data asset details" titleElement="h2">
      <Content component="p">
        Provide general identification and classification details for this data asset.
      </Content>

      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <FormGroup label="Asset name" isRequired fieldId="volume-name">
            <TextInput
              id="volume-name"
              {...field}
              isRequired
              validated={errors.name ? 'error' : 'default'}
              data-testid="volume-name-input"
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

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <FormGroup label="Asset description" fieldId="volume-description">
            <TextArea
              id="volume-description"
              {...field}
              validated={errors.description ? 'error' : 'default'}
              data-testid="volume-description-input"
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

      <FormGroup
        label="Asset type"
        isRequired
        fieldId="asset-type"
        labelHelp={
          <Popover bodyContent="Only unstructured data volumes are supported in this release.">
            <Icon aria-label="Asset type info" role="button">
              <OutlinedQuestionCircleIcon />
            </Icon>
          </Popover>
        }
      >
        <MenuToggle isDisabled isFullWidth data-testid="asset-type-toggle">
          Unstructured
        </MenuToggle>
      </FormGroup>

      <Controller
        name="format"
        control={control}
        render={({ field }) => (
          <FormGroup label="Format" fieldId="volume-format">
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
                  data-testid="volume-format-toggle"
                >
                  {FORMAT_OPTIONS.find((f) => f.key === field.value)?.label || 'Select format'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {FORMAT_OPTIONS.map((option) => (
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

      <Controller
        name="collection"
        control={control}
        render={({ field }) => (
          <FormGroup label="Collection" fieldId="volume-collection">
            <Content component="p">
              Assign this asset to collections to help group your data. To manage collections for
              the entire project, go to{' '}
              <Button variant="link" isInline onClick={onManageCollections}>
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
                  onManageCollections();
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
                  data-testid="volume-collection-toggle"
                >
                  {field.value || 'Select collection'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {collections.map((coll) => (
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

      <FormGroup label="Labels" fieldId="volume-labels">
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
              <Label key={label} onClose={() => handleRemoveLabel(label)}>
                {label}
              </Label>
            ))}
          </LabelGroup>
        ) : null}
        {isAddingLabel ? (
          <TextInput
            id="volume-labels-input"
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
            data-testid="volume-labels-input"
          />
        ) : null}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => setIsAddingLabel(true)}
          data-testid="add-label-button"
        >
          Add label
        </Button>
      </FormGroup>
    </FormSection>
  );
};

export default AssetDetailsSection;
