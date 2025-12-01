# Release Notes Guidelines

This document provides guidelines for writing consistent, informative, and user-friendly release notes for the Gemini History Manager browser extension.

## File Naming & Location

- **Location:** `release-notes/v{version}.md`
- **Format:** Semantic versioning (e.g., `v0.18.8.md`)

## Structure

### Header

Use a consistent header format. Choose **one** style and stick with it:

```markdown
# Release v{version}
```

**Avoid mixing formats** like `# Release Notes`, `## Version X.X.X`, or `# Gemini History Manager vX.X.X`. Keep it simple and consistent.

### Optional: Release Date

For significant releases, include the date:

```markdown
# Release v0.19.0

**Release Date:** December 1, 2025
```

### Optional: Summary

For significant releases (minor version bumps or notable patch releases), include a 1-2 sentence summary:

```markdown
This release introduces robust Gemini crash detection and improves extension reliability with critical timing fixes.
```

### Sections

Use these standardized sections **in order**. Only include sections that apply:

| Section          | Emoji | When to Use                                                    |
| ---------------- | ----- | -------------------------------------------------------------- |
| Breaking Changes | 🚨    | API changes, config changes, or anything requiring user action |
| New Features     | ✨    | New user-facing functionality                                  |
| Improvements     | 🚀    | Enhancements to existing features, UX improvements             |
| Bug Fixes        | 🐛    | Fixed issues                                                   |
| Performance      | ⚡    | Performance optimizations                                      |
| Refactoring      | ♻️    | Internal code changes (only if notable)                        |
| Documentation    | 📄    | README, comments, docs updates                                 |
| Chores           | 🔧    | Build system, dependencies, tooling                            |

## Writing Guidelines

### User-Centric Language

Write for **users first**, then developers. Focus on the **benefit**, not just the technical change.

❌ **Bad:**

```markdown
- Replaced `window` with `self` in `background.js` for service worker compatibility
```

✅ **Good:**

```markdown
- Fixed extension compatibility issues in Google Chrome
```

### Use Action Verbs

Start each item with an action verb:

- ✅ Added, Introduced, Implemented (for new features)
- ✅ Fixed, Resolved, Corrected (for bug fixes)
- ✅ Improved, Enhanced, Optimized (for improvements)
- ✅ Removed, Deprecated (for removals)
- ✅ Updated, Refactored (for changes)

### Scope Prefixes (Optional)

Use scope prefixes sparingly for clarity when the context isn't obvious:

```markdown
- `popup`: Fixed invisible version footer
- `dashboard`: Added conversation export feature
- `build`: Unified release scripts
```

### Issue/PR References

Reference GitHub issues or PRs for traceability:

```markdown
- Fixed the outdated account plan detection algorithm (#215)
```

**Avoid commit hashes** in release notes—they're noisy and not useful to end users.

### Formatting Rules

1. **Use bullet points** (`-`) for lists, not numbers
2. **Bold key terms** for scannability: `**Crash Detection**:`
3. **Keep items concise** — aim for 1-2 lines max
4. **Group related changes** under a single bullet if appropriate

## Templates

### Patch Release (Bug Fixes)

```markdown
# Release v0.18.9

### 🐛 Bug Fixes

- Fixed conversation title detection when sidebar is collapsed (#220)
- Resolved popup layout issues on narrow screens (#221)
```

### Minor Release (New Features)

```markdown
# Release v0.19.0

This release introduces conversation export and improves search performance.

### ✨ New Features

- **Export Conversations**: Export your chat history as JSON or Markdown files
- **Keyboard Shortcuts**: Added `Ctrl+K` to quickly open search

### 🚀 Improvements

- Search results now load 50% faster with optimized indexing
- Improved status messages during chat tracking

### 🐛 Bug Fixes

- Fixed rare crash when Gemini page reloads during active tracking (#225)

### ♻️ Refactoring

- Unified build and release scripts for better maintainability (#216)
```

### Major Release (Breaking Changes)

```markdown
# Release v1.0.0

**Release Date:** December 15, 2025

This release marks the first stable version with a redesigned dashboard and new storage format.

### 🚨 Breaking Changes

- **Storage Format**: History data has been migrated to a new format. Existing data will be automatically converted on first launch.
- **Minimum Browser Version**: Now requires Firefox 115+ or Chrome 120+

### ✨ New Features

- **Redesigned Dashboard**: Completely new UI with improved navigation
- **Cloud Sync**: Optional sync across devices (requires account)

### 🐛 Bug Fixes

- Fixed all known issues with Gem detection (#230, #231, #235)
```

## What NOT to Include

1. **Commit hashes** — Use issue/PR numbers instead
2. **Internal refactors** that don't affect users (unless significant)
3. **Code formatting commits** — These are noise
4. **Duplicate entries** — Consolidate related changes
5. **Technical jargon** without explanation
6. **Every single commit** — Summarize and group related changes

## Checklist Before Committing

- [ ] Consistent header format (`# Release vX.X.X`)
- [ ] Sections are in the correct order
- [ ] Each item starts with an action verb
- [ ] User benefit is clear for each change
- [ ] Issue/PR numbers are referenced where applicable
- [ ] No commit hashes in the notes
- [ ] Spelling and grammar checked
- [ ] Breaking changes (if any) are prominently listed first

## Integration with Release Script

The `release.js` script creates a template at `release-notes/v{version}.md`. Update the template in the script to match these guidelines:

```javascript
const template = `# Release v${version}

### ✨ New Features

### 🚀 Improvements

### 🐛 Bug Fixes

### ♻️ Refactoring
`;
```

Then edit the generated file to:

1. Remove unused sections
2. Add content under each section
3. Include summary for minor/major releases
4. Add breaking changes section if needed (at the top)
