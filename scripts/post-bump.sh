#!/bin/sh
# This script automates the git operations after a version bump.
# It stages changes, commits, pushes the commit, creates a version tag, and pushes the tag.
# Assumes it's run from the root directory of your project where package.json is located.
#
# Usage:
#   ./post-bump.sh
#   ./post-bump.sh --dry-run (to simulate operations without making changes)

set -e # Exit immediately if a command exits with a non-zero status.

DRY_RUN_MODE=false
if [ "$1" = "--dry-run" ]; then
  DRY_RUN_MODE=true
  echo ">>> DRY RUN MODE ENABLED: No actual git operations will be performed. <<<"
  echo "-----------------------------------------------------------------------"
fi

# --- Configuration ---
# Files to be added to git. These are typically the files modified by your bump-version.js script.
FILES_TO_ADD="src/manifest-chrome.json src/manifest-firefox.json package.json README.md"

# --- Script Logic ---

# 1. Get the current version from package.json
# This step is performed even in dry-run mode to formulate messages correctly.
VERSION_RAW=$(node -p "require('./package.json').version" 2>/dev/null)

if [ -z "$VERSION_RAW" ]; then
  echo "Error: Could not retrieve version from package.json." >&2
  echo "Please ensure Node.js is installed, package.json is in the current directory, and contains a 'version' field." >&2
  exit 1
fi

VERSION_TAG="v$VERSION_RAW" # e.g., v1.2.3

if [ "$DRY_RUN_MODE" = true ]; then
  echo "Dry run for version: $VERSION_RAW (tag would be $VERSION_TAG)"
else
  echo "Successfully retrieved version: $VERSION_RAW (tag will be $VERSION_TAG)"
fi


# 2. Add the modified files to git staging
echo "Staging files: $FILES_TO_ADD"
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git add $FILES_TO_ADD"
else
  git add $FILES_TO_ADD
fi

# 3. Commit the changes
COMMIT_MESSAGE="Bump version to $VERSION_TAG" # e.g., Bump version to v1.2.3
echo "Committing with message: '$COMMIT_MESSAGE'"
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git commit -m \"$COMMIT_MESSAGE\""
else
  git commit -m "$COMMIT_MESSAGE"
fi

# 4. Push the commit to the remote repository (current branch)
echo "Pushing main branch changes..."
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git push"
else
  git push
fi

# 5. Create an annotated git tag
TAG_MESSAGE="Release $VERSION_RAW" # e.g., Release 1.2.3
echo "Creating tag: $VERSION_TAG with message: '$TAG_MESSAGE'"
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git tag -a \"$VERSION_TAG\" -m \"$TAG_MESSAGE\""
else
  git tag -a "$VERSION_TAG" -m "$TAG_MESSAGE"
fi

# 6. Push the new tag to the remote repository
echo "Pushing tag $VERSION_TAG to remote..."
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git push origin \"$VERSION_TAG\""
else
  git push origin "$VERSION_TAG"
fi

echo ""
if [ "$DRY_RUN_MODE" = true ]; then
  echo "-----------------------------------------------------------------------"
  echo ">>> DRY RUN COMPLETED. No actual changes were made to your repository. <<<"
else
  echo "Post-bump script completed successfully for version $VERSION_TAG."
  echo "All changes have been committed, pushed, and tagged."
fi
