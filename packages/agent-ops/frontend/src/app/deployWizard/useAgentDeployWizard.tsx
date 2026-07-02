import * as React from 'react';
import {
  DEFAULT_IMAGE_TAG,
  DEFAULT_PERSISTENT_VOLUME_SIZE,
  DEFAULT_PROTOCOL,
} from './wizardOptions';
import type { DeployAgentWizardFormData } from './types';
import { buildFullImageReference, deriveAgentNameFromImage } from './utils';

export type DeployAgentWizardFormField = keyof DeployAgentWizardFormData;

type AgentDeployWizardContextValue = {
  formData: DeployAgentWizardFormData;
  setFormField: <K extends DeployAgentWizardFormField>(
    field: K,
    value: DeployAgentWizardFormData[K],
  ) => void;
  isDirty: boolean;
  setAgentNameManuallyEdited: (value: boolean) => void;
};

const AgentDeployWizardContext = React.createContext<AgentDeployWizardContextValue | null>(null);

export const createInitialFormData = (namespace: string): DeployAgentWizardFormData => ({
  project: namespace,
  containerImage: '',
  imageTag: DEFAULT_IMAGE_TAG,
  agentName: '',
  pullSecret: '',
  fullImageReference: '',
  protocol: DEFAULT_PROTOCOL,
  workloadType: '',
  enablePersistentStorage: false,
  persistentVolumeSize: DEFAULT_PERSISTENT_VOLUME_SIZE,
});

const FORM_FIELDS: DeployAgentWizardFormField[] = [
  'project',
  'containerImage',
  'imageTag',
  'agentName',
  'pullSecret',
  'fullImageReference',
  'protocol',
  'workloadType',
  'enablePersistentStorage',
  'persistentVolumeSize',
];

const isFormDataEqual = (
  left: DeployAgentWizardFormData,
  right: DeployAgentWizardFormData,
): boolean => FORM_FIELDS.every((key) => left[key] === right[key]);

type AgentDeployWizardProviderProps = {
  namespace: string;
  children: React.ReactNode;
};

export const AgentDeployWizardProvider: React.FC<AgentDeployWizardProviderProps> = ({
  namespace,
  children,
}) => {
  const initialFormData = React.useMemo(() => createInitialFormData(namespace), [namespace]);
  const [formData, setFormData] = React.useState<DeployAgentWizardFormData>(initialFormData);
  const agentNameManuallyEditedRef = React.useRef(false);

  const setAgentNameManuallyEdited = React.useCallback((value: boolean) => {
    agentNameManuallyEditedRef.current = value;
  }, []);

  const setFormField = React.useCallback(
    <K extends DeployAgentWizardFormField>(field: K, value: DeployAgentWizardFormData[K]) => {
      setFormData((current) => {
        const next = { ...current, [field]: value };

        if (field === 'containerImage' && typeof value === 'string') {
          if (!agentNameManuallyEditedRef.current) {
            next.agentName = deriveAgentNameFromImage(value);
          }
          next.fullImageReference = buildFullImageReference(value, current.imageTag);
        }

        if (field === 'imageTag' && typeof value === 'string') {
          next.fullImageReference = buildFullImageReference(current.containerImage, value);
        }

        return next;
      });
    },
    [],
  );

  const isDirty = !isFormDataEqual(formData, initialFormData);

  const value = React.useMemo(
    () => ({
      formData,
      setFormField,
      isDirty,
      setAgentNameManuallyEdited,
    }),
    [formData, setFormField, isDirty, setAgentNameManuallyEdited],
  );

  return (
    <AgentDeployWizardContext.Provider value={value}>{children}</AgentDeployWizardContext.Provider>
  );
};

export const useAgentDeployWizardContext = (): AgentDeployWizardContextValue => {
  const context = React.useContext(AgentDeployWizardContext);
  if (!context) {
    throw new Error('useAgentDeployWizardContext must be used within AgentDeployWizardProvider');
  }
  return context;
};
