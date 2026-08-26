import * as React from 'react';
import { HostApiContext } from '../HostApiContext';
import type { HostApiServices } from '../types';

/**
 * Domain-services bridge (metrics, NIM, serving, connections, routing) retained
 * for backward compatibility. This is the shrinking leftover of the original host
 * API, not the full surface — prefer `useHostApiCore` / `useHostApiInfra` for new
 * code. Removal of the domain bridge is tracked by RHOAIENG-79894 / RHOAIENG-79895.
 */
export const useHostApi = (): HostApiServices => React.useContext(HostApiContext);
