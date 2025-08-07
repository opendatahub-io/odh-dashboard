# ⚠️ Do Not Modify Files in the `.tekton/` Directory Directly

The `.tekton/` directory in each component repository is **automatically synchronized** from [`konflux-central`](https://github.com/red-hat-data-services/konflux-central) using automation. Any edits made directly to Tekton files in the component repositories will be **overwritten** by the next sync.

All Tekton file updates **must be made in the `konflux-central` repository**.

## ✅ How to Make Changes

To modify the pipelines for `odh-dashboard` in the `main` branch:

- Clone the [`konflux-central`](https://github.com/red-hat-data-services/konflux-central) repository.

```bash
git clone git@github.com:red-hat-data-services/konflux-central.git
cd konflux-central
```

- Check out the branch

```bash
git checkout main
```

- Navigate to the Tekton files for your component(s).

```bash
cd pipelineruns/odh-dashboard/.tekton
```

- Make the required changes to the Tekton YAML files.

- Commit and push your changes.

```bash
git commit -am "Update pipelinerun for odh-dashboard (main)"
git push origin main
```

- Once pushed, automation will automatically sync your updates to the corresponding component repository.
