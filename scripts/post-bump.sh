#!/bin/sh
# This script automates the git operations after a version bump.
# It stages changes, commits, pushes the commit, creates a version tag, and pushes the tag.
# Assumes it's run from the root directory of your project where package.json is located.

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
# Files to be added to git. These are typically the files modified by your bump-version.js script.
# Your original request for `git add` listed: manifest-chrome.json, manifest-firefox.json, package.json.
# The bump-version.js script also modifies README.md and the manifest files are located in the src/ directory.
# Please adjust the FILES_TO_ADD variable below if your setup or the list of modified files differs.
FILES_TO_ADD="src/manifest-chrome.json src/manifest-firefox.json package.json README.md"

# --- Script Logic ---

# 1. Get the current version from package.json
# We use Node.js here to reliably parse the JSON and extract the version.
# Suppress potential npm/node warnings by redirecting stderr to /dev/null.
VERSION_RAW=$(node -p "require('./package.json').version" 2>/dev/null)

if [ -z "$VERSION_RAW" ]; then
  echo "Error: Could not retrieve version from package.json." >&2
  echo "Please ensure Node.js is installed, package.json is in the current directory, and contains a 'version' field." >&2
  exit 1
fi

VERSION_TAG="v$VERSION_RAW" # e.g., v1.2.3

echo "Successfully retrieved version: $VERSION_RAW (tag will be $VERSION_TAG)"

# 2. Add the modified files to git staging
echo "Staging files: $FILES_TO_ADD"
git add $FILES_TO_ADD

# 3. Commit the changes
# A commit is essential to save the staged changes to the repository's history before pushing.
COMMIT_MESSAGE="Bump version to $VERSION_TAG" # e.g., Bump version to v1.2.3
echo "Committing with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# 4. Push the commit to the remote repository (current branch)
echo "Pushing commit to remote..."
git push

# 5. Create an annotated git tag
# Using the format "Release X.Y.Z" for the tag message as per your example.
TAG_MESSAGE="Release $VERSION_RAW" # e.g., Release 1.2.3
echo "Creating tag: $VERSION_TAG with message: '$TAG_MESSAGE'"
git tag -a "$VERSION_TAG" -m "$TAG_MESSAGE"

# 6. Push the new tag to the remote repository
echo "Pushing tag $VERSION_TAG to remote..."
git push origin "$VERSION_TAG"

echo ""
echo "Post-bump script completed successfully for version $VERSION_TAG."
echo "All changes have been committed, pushed, and tagged."
echo "You can now create a release on GitHub or your preferred platform using this tag."