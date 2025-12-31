#!/bin/bash
# Close all open Dependabot PRs that have been resolved by the dependency update

set -e

echo "🔍 Fetching open Dependabot PRs..."

# Get all open Dependabot PRs
PRS=$(gh pr list --author "app/dependabot" --state open --json number,title --limit 100)

if [ -z "$PRS" ] || [ "$PRS" == "[]" ]; then
    echo "✅ No open Dependabot PRs found"
    exit 0
fi

# Count PRs
PR_COUNT=$(echo "$PRS" | jq '. | length')
echo "📋 Found $PR_COUNT open Dependabot PR(s)"

# Close each PR with a comment
echo "$PRS" | jq -r '.[] | "\(.number)|\(.title)"' | while IFS='|' read -r number title; do
    echo "🔒 Closing PR #$number: $title"
    gh pr close "$number" --comment "This PR has been superseded by a consolidated dependency update. All dependencies have been updated in the main branch." || {
        echo "⚠️  Failed to close PR #$number"
    }
done

echo "✅ Finished closing Dependabot PRs"

