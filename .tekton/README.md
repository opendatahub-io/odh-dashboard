# ⚠️ Do Not Modify Files in the `.tekton/` Directory Directly

> 🔴 **Do not edit `.tekton/` files directly in the component repositories.**

The `.tekton/` directory in each component repository is **automatically synchronized** from [`konflux-central`](https://github.com/red-hat-data-services/konflux-central) using automation.

Any edits made directly to Tekton files in the component repositories will be **overwritten** by the next sync.  
All Tekton file updates **must be made in the `konflux-central` repository**.

---

## ✅ How to Make Changes

To update Tekton pipeline definitions:

1. Clone the [`konflux-central`](https://github.com/red-hat-data-services/konflux-central) repository.
2. Check out the respective release branch (e.g., `rhoai-2.21`) where you want to make updates.
3. Navigate to `pipelineruns/<repository_name>/.tekton`.
4. Make the required changes to the Tekton YAML files.
5. Commit and push your changes.
6. Once pushed, automation will automatically sync your updates to the corresponding component repository.

---

## 💡 Example

To modify the pipeline for `odh-dashboard` in the `rhoai-2.21` release:

```bash
# Clone the konflux-central repository
git clone git@github.com:red-hat-data-services/konflux-central.git

# Move into the repository directory
cd konflux-central

# Checkout the release branch you want to update (e.g., rhoai-2.21)
git checkout rhoai-2.21

# Navigate to the Tekton files for the specific component
cd pipelineruns/odh-dashboard/.tekton

# Make your changes to the .yml/.yaml files here

# Stage and commit your changes with a meaningful commit message
git commit -am "Update pipelinerun for odh-dashboard (rhoai-2.21)"

# Push the changes to the remote branch
git push origin rhoai-2.21
```
