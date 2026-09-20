import type {
  PluginStoreInterface,
  PluginInfoEntry,
  LoadedExtension,
  FeatureFlags,
  AnyObject,
  Extension,
} from '@openshift/dynamic-plugin-sdk';
import { PluginEventType } from '@openshift/dynamic-plugin-sdk';
import { isEqual, pickBy } from 'lodash-es';
import {
  type StoredPatch,
  extractPatches,
  applySuppress,
  applyPatches,
} from './extensionResolution';

const uuidv4 = () =>
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
  );

export class PluginStore implements PluginStoreInterface {
  /** All extensions. */
  private allExtensions: LoadedExtension[] = [];

  /** Extensions which are currently in use. */
  private extensions: LoadedExtension[] = [];

  /** Last-wins property patches keyed by `(type, id)`, collected at construction. */
  private readonly patches: Map<string, StoredPatch>;

  /** Subscribed event listeners. */
  private readonly listeners = new Map<PluginEventType, Set<VoidFunction>>();

  /** Feature flags used to determine the availability of extensions. */
  private featureFlags: FeatureFlags = {};

  constructor(extensions: Record<string, Extension[]>) {
    const raw: LoadedExtension[] = [];
    Object.entries(extensions).forEach(([pluginName, pluginExtensions]) => {
      pluginExtensions.forEach((e: Extension) => {
        raw.push({
          ...e,
          pluginName,
          uid: uuidv4(),
        });
      });
    });

    const { extensions: withoutPatches, patches } = extractPatches(raw);
    this.patches = patches;
    this.allExtensions = applySuppress(withoutPatches);

    Object.values(PluginEventType).forEach((t) => {
      this.listeners.set(t, new Set());
    });

    this.updateExtensions();
  }

  get sdkVersion(): string {
    return '0.1';
  }

  private invokeListeners(eventType: PluginEventType) {
    this.listeners.get(eventType)?.forEach((listener) => {
      listener();
    });
  }

  private updateExtensions() {
    const prevExtensions = this.extensions;

    const inUse = this.allExtensions.filter((e) => this.isExtensionInUse(e));
    this.extensions = applyPatches(inUse, this.patches);

    if (!isEqual(prevExtensions, this.extensions)) {
      this.invokeListeners(PluginEventType.ExtensionsChanged);
    }
  }

  private isExtensionInUse(extension: LoadedExtension) {
    return (
      (extension.flags?.required?.every((f) => this.featureFlags[f] === true) ?? true) &&
      (extension.flags?.disallowed?.every((f) => this.featureFlags[f] === false) ?? true)
    );
  }

  subscribe(eventTypes: PluginEventType[], listener: VoidFunction): VoidFunction {
    let isSubscribed = true;

    if (eventTypes.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('subscribe method called with empty eventTypes');
      return () => {
        // noop
      };
    }

    eventTypes.forEach((t) => {
      this.listeners.get(t)?.add(listener);
    });

    return () => {
      if (isSubscribed) {
        isSubscribed = false;

        eventTypes.forEach((t) => {
          this.listeners.get(t)?.delete(listener);
        });
      }
    };
  }

  getExtensions(): LoadedExtension[] {
    return [...this.extensions];
  }

  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  setFeatureFlags(newFlags: FeatureFlags): void {
    const prevFeatureFlags = this.featureFlags;

    this.featureFlags = {
      ...this.featureFlags,
      ...pickBy(newFlags, (value) => typeof value === 'boolean'),
    };

    if (!isEqual(prevFeatureFlags, this.featureFlags)) {
      this.updateExtensions();
      this.invokeListeners(PluginEventType.FeatureFlagsChanged);
    }
  }

  getPluginInfo(): PluginInfoEntry[] {
    throw new Error('Not implemented');
  }

  loadPlugin(): Promise<void> {
    throw new Error('Not implemented');
  }

  enablePlugins(): void {
    throw new Error('Not implemented');
  }

  disablePlugins(): void {
    throw new Error('Not implemented');
  }

  getExposedModule<TModule extends AnyObject>(): Promise<TModule> {
    throw new Error('Not implemented');
  }
}
