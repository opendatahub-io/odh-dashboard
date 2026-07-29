export type AgentLifecycleAction = 'stop' | 'start' | 'restart';

export type LifecycleResult = {
  success: boolean;
  name: string;
  namespace: string;
  action: AgentLifecycleAction;
  message: string;
};

export type AgentLifecycleParams = {
  namespace: string;
  name: string;
};
