export type ContainerSizeLimits = {
  minCpu: string | number;
  maxCpu?: string | number;
  minMemory: string;
  maxMemory?: string;
};
