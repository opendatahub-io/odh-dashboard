This document describes some additional refinements to the plan for extraction, refactoring, and migration in regards to AutoML/AutoRAG and autox-core.

- leave automl/autorag specific features like model registry and llamastack alone
- refactor automl/autorag to follow proper layered design and seperation of concerns, (handlers = http, repositories = business logic (misnomer but oh well), clients = low-level wrappers around external services)
- refactor middleware to remove business logic and consume from services (e.g. RequireAccessToService should consume the pipelines service)
- automl/autorag should not test anything from autox-core, autox-core should own that
- all relevant models, helpers, and constants should move into the appropriate folders in autox-core
- automl should still have its own s3 service (or repository) that sits on top of autox-core s3 service so it can handle csv stuff
- leave port forwarding stuff alone
