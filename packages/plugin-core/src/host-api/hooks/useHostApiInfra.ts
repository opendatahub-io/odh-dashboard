import * as React from 'react';
import { HostApiInfraContext } from '../HostApiInfraContext';
import type { HostApiInfraServices } from '../types';

export const useHostApiInfra = (): HostApiInfraServices => React.useContext(HostApiInfraContext);
