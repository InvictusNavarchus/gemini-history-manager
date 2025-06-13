#!/bin/sh
# This script automates the git operations after a version bump.
# It creates release notes (if they don't exist), stages changes, commits, pushes the commit, 
# creates a version tag, and pushes the tag.
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

# 2. Create release notes if they don't exist
RELEASE_NOTES_FILE="release-notes/$VERSION_TAG.md"

if [ ! -f "$RELEASE_NOTES_FILE" ]; then
  echo "Creating release notes for $VERSION_TAG..."
  
  if [ "$DRY_RUN_MODE" = true ]; then
    echo "DRY RUN: Would create release notes file: $RELEASE_NOTES_FILE"
    echo "DRY RUN: Would open editor for release notes"
  else
    # Create release-notes directory if it doesn't exist
    mkdir -p release-notes
    
    # Create empty release notes file
    touch "$RELEASE_NOTES_FILE"

    # Open the editor for the user to write release notes
    # Try micro first (user's preference), then fall back to common editors
    if command -v micro >/dev/null 2>&1; then
      echo "Opening micro editor for release notes..."
      micro "$RELEASE_NOTES_FILE"
    elif [ -n "$EDITOR" ]; then
      echo "Opening \$EDITOR ($EDITOR) for release notes..."
      $EDITOR "$RELEASE_NOTES_FILE"
    elif command -v nano >/dev/null 2>&1; then
      echo "Opening nano editor for release notes..."
      nano "$RELEASE_NOTES_FILE"
    elif command -v vim >/dev/null 2>&1; then
      echo "Opening vim editor for release notes..."
      vim "$RELEASE_NOTES_FILE"
    else
      echo "Warning: No suitable editor found. Please edit $RELEASE_NOTES_FILE manually."
      echo "Press Enter to continue after editing the file..."
      read -r dummy
    fi
    
    echo "Release notes created: $RELEASE_NOTES_FILE"
  fi
else
  echo "Release notes already exist: $RELEASE_NOTES_FILE"
fi

# 3. Add the modified files to git staging
echo "Staging files: $FILES_TO_ADD $RELEASE_NOTES_FILE"
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git add $FILES_TO_ADD $RELEASE_NOTES_FILE"
else
  git add $FILES_TO_ADD
  # Add release notes file if it exists
  if [ -f "$RELEASE_NOTES_FILE" ]; then
    git add "$RELEASE_NOTES_FILE"
  fi
fi

# 4. Commit the changes
COMMIT_MESSAGE="chore: bump version to $VERSION_TAG" # e.g., Bump version to v1.2.3
echo "Committing with message: '$COMMIT_MESSAGE'"
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git commit -m \"$COMMIT_MESSAGE\""
else
  git commit -m "$COMMIT_MESSAGE"
fi

# 5. Push the commit to the remote repository (current branch)
echo "Pushing main branch changes..."
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git push"
else
  git push
fi

# 6. Create an annotated git tag
TAG_MESSAGE="Release $VERSION_RAW" # e.g., Release 1.2.3
echo "Creating tag: $VERSION_TAG with message: '$TAG_MESSAGE'"
if [ "$DRY_RUN_MODE" = true ]; then
  echo "DRY RUN: Would execute: git tag -a \"$VERSION_TAG\" -m \"$TAG_MESSAGE\""
else
  git tag -a "$VERSION_TAG" -m "$TAG_MESSAGE"
fi

# 7. Push the new tag to the remote repository
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
