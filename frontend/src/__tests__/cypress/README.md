### Cypress Testing

TODO

## Experimental Snapshot Testing

Snapshot testing involves running tests against a live cluster and recording network responses on the fly and saving them to disk in JSON format. The the same test can then run off cluster where the snapshot is used to respond to network requests.

Snapshot test files have a `scy.ts` extension.