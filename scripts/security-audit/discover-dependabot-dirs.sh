#!/usr/bin/env bash
# Parse .github/dependabot.yml and emit npm/gomod directory JSON arrays.
# Usage: discover-dependabot-dirs.sh [path-to-dependabot.yml]
set -euo pipefail

DEPENDABOT_FILE="${1:-.github/dependabot.yml}"

if [[ ! -f "$DEPENDABOT_FILE" ]]; then
  echo "error: dependabot config not found: $DEPENDABOT_FILE" >&2
  exit 1
fi

# Ruby ships with YAML on GitHub-hosted Ubuntu runners.
RESULT="$(
  ruby -ryaml -rjson -e '
    doc = YAML.load_file(ARGV[0])
    updates = doc.fetch("updates")

    def dirs(entry)
      list = entry["directories"] || [entry["directory"]].compact
      list.map { |d| d == "/" ? "." : d.sub(%r{\A/}, "") }
    end

    npm_dirs = updates
      .select { |u| u["package-ecosystem"] == "npm" }
      .flat_map { |u| dirs(u) }
      .uniq
    go_dirs = updates
      .select { |u| u["package-ecosystem"] == "gomod" }
      .flat_map { |u| dirs(u) }
      .uniq

    abort "error: npm ecosystem missing from dependabot.yml" if npm_dirs.empty?
    abort "error: gomod ecosystem missing from dependabot.yml" if go_dirs.empty?

    puts JSON.generate({ "npm" => npm_dirs, "gomod" => go_dirs })
  ' "$DEPENDABOT_FILE"
)"

echo "$RESULT"
echo "Discovered npm dirs: $(echo "$RESULT" | jq -c '.npm')" >&2
echo "Discovered gomod dirs: $(echo "$RESULT" | jq -c '.gomod')" >&2
