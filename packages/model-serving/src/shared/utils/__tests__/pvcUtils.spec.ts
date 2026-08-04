import { getModelPathFromUri, isPVCUri, getPVCNameFromURI } from '../pvcUtils';

describe('getModelPathFromUri', () => {
  it('should return the model path', () => {
    const uri = 'pvc://pvc-1/model-path';
    expect(getModelPathFromUri(uri)).toEqual('model-path');
  });
  it('should return an empty string if the URI is not a valid URI', () => {
    const uri = 'not a uri';
    expect(getModelPathFromUri(uri)).toEqual('');
  });
});

describe('isPVCUri', () => {
  it('should return true if the URI is a PVC URI', () => {
    const uri = 'pvc://pvc-1/model-path';
    expect(isPVCUri(uri)).toEqual(true);
  });
  it('should return false if the URI is not a PVC URI', () => {
    const uri = 'not a uri';
    expect(isPVCUri(uri)).toEqual(false);
  });
});

describe('getPVCNameFromURI', () => {
  it('should return the PVC name from the URI', () => {
    const uri = 'pvc://pvc-1/model-path';
    expect(getPVCNameFromURI(uri)).toEqual('pvc-1');
  });
  it('should return an empty string if the URI is not a valid URI', () => {
    const uri = 'not a uri';
    expect(getPVCNameFromURI(uri)).toEqual('');
  });
  it('should return an empty string if the URI is not a PVC URI', () => {
    const uri = 'http://pvc-1/model-path';
    expect(getPVCNameFromURI(uri)).toEqual('');
  });
});
