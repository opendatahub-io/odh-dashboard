import * as React from 'react';
import {
  DEFAULT_ENV_VAR,
  DEFAULT_IMAGE_TAG,
  DEFAULT_PERSISTENT_VOLUME_SIZE,
  DEFAULT_PROTOCOL,
  DEFAULT_SERVICE_PORT,
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
  updateServicePort: (index: number, partial: Partial<DeployAgentServicePort>) => void;
  addServicePort: () => void;
  removeServicePort: (index: number) => void;
  updateEnvVar: (index: number, partial: Partial<DeployAgentEnvVar>) => void;
  addEnvVar: () => void;
  removeEnvVar: (index: number) => void;
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
  framework: '',
  workloadType: '',
  enablePersistentStorage: false,
  persistentVolumeSize: DEFAULT_PERSISTENT_VOLUME_SIZE,
  servicePorts: [{ ...DEFAULT_SERVICE_PORT }],
  createRoute: false,
  authBridgeEnabled: true,
  useEnvoySidecar: false,
  authBridgeOutboundPortsExclude: '',
  authBridgeInboundPortsExclude: '',
  authBridgeDefaultOutboundPolicy: '',
  enableSpireIdentity: false,
  mtlsMode: '',
  envVars: [],
});

const isFormDataEqual = (
  left: DeployAgentWizardFormData,
  right: DeployAgentWizardFormData,
): boolean => JSON.stringify(left) === JSON.stringify(right);

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

        if (field === 'authBridgeEnabled' && value === false) {
          next.useEnvoySidecar = false;
          next.mtlsMode = '';
          next.authBridgeOutboundPortsExclude = '';
          next.authBridgeInboundPortsExclude = '';
          next.authBridgeDefaultOutboundPolicy = '';
        }

        return next;
      });
    },
    [],
  );

  const updateServicePort = React.useCallback(
    (index: number, partial: Partial<DeployAgentServicePort>) => {
      setFormData((current) => ({
        ...current,
        servicePorts: current.servicePorts.map((port, i) =>
          i === index ? { ...port, ...partial } : port,
        ),
      }));
    },
    [],
  );

  const addServicePort = React.useCallback(() => {
    setFormData((current) => ({
      ...current,
      servicePorts: [
        ...current.servicePorts,
        { name: '', port: 8080, targetPort: 8000, protocol: DEFAULT_SERVICE_PORT.protocol },
      ],
    }));
  }, []);

  const removeServicePort = React.useCallback((index: number) => {
    setFormData((current) => ({
      ...current,
      servicePorts: current.servicePorts.filter((_, i) => i !== index),
    }));
  }, []);

  const updateEnvVar = React.useCallback((index: number, partial: Partial<DeployAgentEnvVar>) => {
    setFormData((current) => ({
      ...current,
      envVars: current.envVars.map((envVar, i) =>
        i === index ? { ...envVar, ...partial } : envVar,
      ),
    }));
  }, []);

  const addEnvVar = React.useCallback(() => {
    setFormData((current) => ({
      ...current,
      envVars: [...current.envVars, { ...DEFAULT_ENV_VAR }],
    }));
  }, []);

  const removeEnvVar = React.useCallback((index: number) => {
    setFormData((current) => ({
      ...current,
      envVars: current.envVars.filter((_, i) => i !== index),
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
