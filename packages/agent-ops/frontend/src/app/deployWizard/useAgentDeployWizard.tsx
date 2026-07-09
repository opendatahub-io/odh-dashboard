import * as React from 'react';
import {
  createEnvVar,
  createServicePort,
  DEFAULT_IMAGE_TAG,
  DEFAULT_PERSISTENT_VOLUME_SIZE,
  DEFAULT_PROTOCOL,
  DEFAULT_WORKLOAD_TYPE,
} from './wizardOptions';
import type { DeployAgentEnvVar, DeployAgentServicePort, DeployAgentWizardFormData } from './types';
import { buildFullImageReference, deriveAgentNameFromImage } from './utils';

export type DeployAgentWizardFormField = keyof DeployAgentWizardFormData;

type AgentDeployWizardContextValue = {
  formData: DeployAgentWizardFormData;
  setFormField: <K extends DeployAgentWizardFormField>(
    field: K,
    value: DeployAgentWizardFormData[K],
  ) => void;
  updateServicePort: (rowId: string, partial: Partial<DeployAgentServicePort>) => void;
  addServicePort: () => void;
  removeServicePort: (rowId: string) => void;
  updateEnvVar: (rowId: string, partial: Partial<DeployAgentEnvVar>) => void;
  addEnvVar: () => void;
  removeEnvVar: (rowId: string) => void;
  isDirty: boolean;
  setAgentNameManuallyEdited: (value: boolean) => void;
};

const AgentDeployWizardContext = React.createContext<AgentDeployWizardContextValue | null>(null);

export const createInitialFormData = (namespace: string): DeployAgentWizardFormData => ({
  project: namespace,
  containerImage: '',
  imageTag: DEFAULT_IMAGE_TAG,
  agentName: '',
  description: '',
  pullSecret: '',
  fullImageReference: '',
  protocol: DEFAULT_PROTOCOL,
  framework: '',
  workloadType: DEFAULT_WORKLOAD_TYPE,
  enablePersistentStorage: false,
  persistentVolumeSize: DEFAULT_PERSISTENT_VOLUME_SIZE,
  servicePorts: [createServicePort()],
  envVars: [],
});

const normalizeFormDataForComparison = (data: DeployAgentWizardFormData) => ({
  ...data,
  servicePorts: data.servicePorts.map(({ name, port, targetPort, protocol }) => ({
    name,
    port,
    targetPort,
    protocol,
  })),
  envVars: data.envVars.map(
    ({ name, type, value, secretName, secretKey, configMapName, configMapKey }) => ({
      name,
      type,
      value,
      secretName,
      secretKey,
      configMapName,
      configMapKey,
    }),
  ),
});

const isFormDataEqual = (
  left: DeployAgentWizardFormData,
  right: DeployAgentWizardFormData,
): boolean =>
  JSON.stringify(normalizeFormDataForComparison(left)) ===
  JSON.stringify(normalizeFormDataForComparison(right));

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

  const updateServicePort = React.useCallback(
    (rowId: string, partial: Partial<DeployAgentServicePort>) => {
      setFormData((current) => ({
        ...current,
        servicePorts: current.servicePorts.map((port) =>
          port.rowId === rowId ? { ...port, ...partial } : port,
        ),
      }));
    },
    [],
  );

  const addServicePort = React.useCallback(() => {
    setFormData((current) => ({
      ...current,
      servicePorts: [...current.servicePorts, createServicePort({ name: '' })],
    }));
  }, []);

  const removeServicePort = React.useCallback((rowId: string) => {
    setFormData((current) => ({
      ...current,
      servicePorts: current.servicePorts.filter((port) => port.rowId !== rowId),
    }));
  }, []);

  const updateEnvVar = React.useCallback((rowId: string, partial: Partial<DeployAgentEnvVar>) => {
    setFormData((current) => ({
      ...current,
      envVars: current.envVars.map((envVar) =>
        envVar.rowId === rowId ? { ...envVar, ...partial } : envVar,
      ),
    }));
  }, []);

  const addEnvVar = React.useCallback(() => {
    setFormData((current) => ({
      ...current,
      envVars: [...current.envVars, createEnvVar()],
    }));
  }, []);

  const removeEnvVar = React.useCallback((rowId: string) => {
    setFormData((current) => ({
      ...current,
      envVars: current.envVars.filter((envVar) => envVar.rowId !== rowId),
    }));
  }, []);

  const isDirty = !isFormDataEqual(formData, initialFormData);

  const value = React.useMemo(
    () => ({
      formData,
      setFormField,
      updateServicePort,
      addServicePort,
      removeServicePort,
      updateEnvVar,
      addEnvVar,
      removeEnvVar,
      isDirty,
      setAgentNameManuallyEdited,
    }),
    [
      formData,
      setFormField,
      updateServicePort,
      addServicePort,
      removeServicePort,
      updateEnvVar,
      addEnvVar,
      removeEnvVar,
      isDirty,
      setAgentNameManuallyEdited,
    ],
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
