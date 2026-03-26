import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Content, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  MaaSModelRefSummary,
  MaaSSubscription,
  SubscriptionModelEntry,
  TokenRateLimit,
} from '~/app/types/subscriptions';
import SubscriptionModelsTable from './SubscriptionModelsTable';
import AddModelsModal from './AddModelsModal';
import EditRateLimitsModal from './EditRateLimitsModal';

type SubscriptionModelsSectionProps = {
  models: SubscriptionModelEntry[];
  setModels: React.Dispatch<React.SetStateAction<SubscriptionModelEntry[]>>;
  availableModelRefs: MaaSModelRefSummary[];
  allSubscriptions: MaaSSubscription[];
};

type EditLimitsTarget = {
  modelIndex: number;
};

const SubscriptionModelsSection: React.FC<SubscriptionModelsSectionProps> = ({
  models,
  setModels,
  availableModelRefs,
  allSubscriptions,
}) => {
  const [isAddModelsModalOpen, setIsAddModelsModalOpen] = React.useState(false);
  const [editLimitsTarget, setEditLimitsTarget] = React.useState<EditLimitsTarget | null>(null);

  const handleAddModels = (selectedRefs: MaaSModelRefSummary[]) => {
    const existingNames = new Set(models.map((m) => m.modelRefSummary.name));
    const newEntries: SubscriptionModelEntry[] = selectedRefs
      .filter((ref) => !existingNames.has(ref.name))
      .map((ref) => ({
        modelRefSummary: ref,
        tokenRateLimits: [],
      }));

    setModels((prev) => [...prev, ...newEntries]);
  };

  const handleRemoveModel = (index: number) => {
    setModels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRateLimits = (rateLimits: TokenRateLimit[]) => {
    if (editLimitsTarget == null) {
      return;
    }
    setModels((prev) =>
      prev.map((entry, i) => {
        if (i !== editLimitsTarget.modelIndex) {
          return entry;
        }
        return { ...entry, tokenRateLimits: rateLimits };
      }),
    );
  };

  const editingModel = editLimitsTarget != null ? models[editLimitsTarget.modelIndex] : null;

  return (
    <>
      <FormGroup fieldId="subscription-models">
        <Stack hasGutter>
          <StackItem>
            <Content component="h3">Models</Content>
            <Content component="small">Add models that subscribers will be able to use.</Content>
          </StackItem>

          {availableModelRefs.length === 0 ? (
            <StackItem>
              <Alert
                variant="warning"
                isInline
                title="No models available"
                data-testid="no-models-warning"
              >
                There are no model endpoints available on the cluster. Deploy a model on the{' '}
                <Link to="/ai-hub/deployments">Deployments page</Link> and create a MaaSModelRef
                before creating a subscription.
              </Alert>
            </StackItem>
          ) : (
            <>
              {models.length > 0 && (
                <StackItem>
                  <SubscriptionModelsTable
                    models={models}
                    onRemoveModel={handleRemoveModel}
                    onEditLimits={(index) => setEditLimitsTarget({ modelIndex: index })}
                  />
                </StackItem>
              )}

              <StackItem>
                <Button
                  variant="link"
                  icon={<PlusCircleIcon />}
                  onClick={() => setIsAddModelsModalOpen(true)}
                  data-testid="add-models-button"
                >
                  Add models
                </Button>
              </StackItem>
            </>
          )}
        </Stack>
      </FormGroup>

      {isAddModelsModalOpen && (
        <AddModelsModal
          availableModelRefs={availableModelRefs}
          allSubscriptions={allSubscriptions}
          currentModels={models}
          onAdd={handleAddModels}
          onRemove={(ref) => {
            const idx = models.findIndex((m) => m.modelRefSummary.name === ref.name);
            if (idx >= 0) {
              handleRemoveModel(idx);
            }
          }}
          onClose={() => setIsAddModelsModalOpen(false)}
        />
      )}

      {editLimitsTarget != null && editingModel && (
        <EditRateLimitsModal
          modelName={editingModel.modelRefSummary.name}
          rateLimits={editingModel.tokenRateLimits}
          onSave={handleSaveRateLimits}
          onClose={() => setEditLimitsTarget(null)}
        />
      )}
    </>
  );
};

export default SubscriptionModelsSection;
