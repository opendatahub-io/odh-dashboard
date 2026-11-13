# Vendored MLMD protobuf code

Message and service stubs for the MLMD `metadata_store_service.proto` gRPC-Web API, copied from
the Kubeflow Pipelines frontend
([`frontend/src/third_party/mlmd` at `f1f9405`](https://github.com/kubeflow/pipelines/tree/f1f94058c623e48876146cfd855e6450aadeacd1/frontend/src/third_party/mlmd))
and generated with [`protoc-gen-js`](https://github.com/protocolbuffers/protobuf-javascript).

Upstream deleted that directory in
[PR #13986](https://github.com/kubeflow/pipelines/pull/13986) (merged 2026-09-14), which replaced
MLMD tracking with Kubeflow's own task and artifact APIs
([issue #11760](https://github.com/kubeflow/pipelines/issues/11760)). The link above is pinned to
the last commit that still contained the generated stubs: there is no upstream left to track, so
this copy is ours to maintain.

Do not hand-edit these files, with one documented exception.

## CSP patch

`metadata_store_pb.js` and `metadata_store_service_pb.js` are patched after generation, at line 16:

```diff
-var global = Function('return this')();
+var global = globalThis;
```

`protoc-gen-js` emits the `Function('return this')()` global-shim trick, which CSP classifies as
`unsafe-eval`. The dashboard's policy is `script-src 'self' https://console.redhat.com`
(see [`docs/content-security-policy.md`](../../../../docs/content-security-policy.md)), so the
unpatched line throws while the module is being evaluated and leaves the SPA blank once the
policy is enforced. `global` is only ever used as the target of `goog.exportSymbol(...)`, so any
reference to the global object is equivalent.

**Re-apply this patch whenever these files are regenerated.**
`frontend/config/__tests__/cspVendoredCode.spec.js` fails if the patch is lost.

A ts-proto variant of the same schema is vendored for test mocks in
[`src/__mocks__/third_party/mlmd`](../../__mocks__/third_party/mlmd/README.md). It is eval-free
and could replace this code if Kubeflow migrates MLMD to ts-proto.
