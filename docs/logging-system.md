# Gemini History Manager - Logging System Documentation

## Overview

The Gemini History Manager extension implements a flexible, centralized logging configuration system. This system provides:

- Global on/off control for all logs
- Fine-grained control over log levels (debug, log, warn, error)
- Component-specific logging filters
- Persistent configuration storage

## Architecture

### Core Components

1. **logConfig.js**: The central configuration module that provides:
   - Default configuration
   - Methods for loading and saving configuration
   - Helper functions for enabling/disabling specific log types

2. **Logger Module**: The logging implementation in utils.js that:
   - Checks if logging is enabled for a given component and level
   - Formats log messages with contextual information
   - Provides backward compatibility with legacy code

3. **Content Script Logger**: A separate logger implementation for content scripts that:
   - Uses the same configuration structure as the main Logger
   - Avoids circular dependencies

4. **UI Configuration**: A settings UI that allows users to:
   - Toggle logging on/off globally
   - Control specific log levels
   - Enable/disable logging for individual components

## Usage Guide

### Basic Logging

When logging messages, always include a component context and structured data:

```javascript
// Old approach (not recommended):
Logger.log("Something happened");

// New approach:
Logger.log("ComponentName", "Something happened", { additionalData: "value" });
```

### Log Levels

Choose the appropriate log level:

- `debug`: Detailed information for development/diagnostics
- `log`: Standard information for operational events
- `warn`: Potential issues that don't prevent operation
- `error`: Critical issues that need attention

Example:
```javascript
// Debug message with component context and data
Logger.debug("ThemeManager", "Applying theme", { theme: "dark" });

// Error with component context and error object
Logger.error("DataLoader", "Failed to load data", error, { attempts: retryCount });
```

### Adding a New Component to Logging

When creating a new component that needs logging:

1. Import the Logger:
```javascript
import { Logger } from '../../lib/utils.js';
```

2. Use the context-based logging pattern:
```javascript
Logger.log("YourComponent", "Event description", { relevantData });
```

3. Add your component to the DEFAULT_CONFIG in logConfig.js:
```javascript
components: {
  // ... existing components
  YourComponent: true,
}
```

## Testing and Troubleshooting

### Enabling Debug Logs

To enable detailed debug logs:

1. Open the dashboard
2. Navigate to the Settings tab
3. Select Logging
4. Ensure "Enable All Logging" is checked
5. Verify the "Debug" level is enabled

### Common Issues

**Logs not showing**: Check if:
- The global logging is enabled
- The specific log level is enabled
- The component is enabled
- The browser console is filtering out logs

## Implementation Details

### Configuration Format

The log configuration is stored in localStorage as a JSON object with this structure:

```javascript
{
  "enabled": true,
  "levels": {
    "debug": true,
    "log": true,
    "warn": true,
    "error": true
  },
  "components": {
    "App": true,
    "ThemeManager": true,
    // etc.
  }
}
```

### Log Format

Log messages follow this format:
```
[Gemini History] [ComponentName] Message additional_data
```

Example:
```
[Gemini History] [ThemeManager] Applying theme { theme: "dark" }
```

## Future Enhancements

Potential improvements for the logging system:

1. Remote logging to help with user issue diagnosis
2. Log file export for easier bug reporting
3. Performance metrics and timing information
4. Log grouping by feature or user flow
5. More advanced filtering by log content
