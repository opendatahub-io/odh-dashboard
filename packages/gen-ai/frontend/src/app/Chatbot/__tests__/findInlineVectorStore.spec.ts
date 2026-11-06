/* eslint-disable camelcase */
import { mockVectorStores } from '~/__mocks__/mockVectorStores';
import { findInlineVectorStore } from '~/app/Chatbot/findInlineVectorStore';

describe('findInlineVectorStore', () => {
  it('should skip stores with null or missing metadata and find the signed-in user store', () => {
    const missingMetadataStore = { ...mockVectorStores[0], id: 'vs-missing' };
    Reflect.deleteProperty(missingMetadataStore, 'metadata');
    const nullMetadataStore = { ...mockVectorStores[0], id: 'vs-null', metadata: null };
    const otherUserStore = {
      ...mockVectorStores[0],
      id: 'vs-bob',
      metadata: { provider_id: 'milvus', created_by: 'auto-provisioning', username: 'bob' },
    };
    const signedInUserStore = {
      ...mockVectorStores[0],
      id: 'vs-alice',
      metadata: { provider_id: 'milvus', created_by: 'auto-provisioning', username: 'alice' },
    };

    expect(
      findInlineVectorStore(
        [missingMetadataStore, nullMetadataStore, otherUserStore, signedInUserStore],
        'alice',
      ),
    ).toBe(signedInUserStore);
  });

  it('should return nothing when stores have only null or missing metadata', () => {
    const missingMetadataStore = { ...mockVectorStores[0], id: 'vs-missing' };
    Reflect.deleteProperty(missingMetadataStore, 'metadata');
    const nullMetadataStore = { ...mockVectorStores[0], id: 'vs-null', metadata: null };

    expect(
      findInlineVectorStore([missingMetadataStore, nullMetadataStore], 'alice'),
    ).toBeUndefined();
  });

  it('should return nothing before the username is known', () => {
    const signedInUserStore = {
      ...mockVectorStores[0],
      metadata: { provider_id: 'milvus', created_by: 'auto-provisioning', username: 'alice' },
    };

    expect(findInlineVectorStore([signedInUserStore])).toBeUndefined();
  });
});
