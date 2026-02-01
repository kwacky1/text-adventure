name: Check Feature Parity
description: Compare renderer implementations across all platforms
model: claude-sonnet-4-20250514
tools:
  - read_file
  - grep_search
  - file_search

instructions: |
  Compare what each platform renderer implements to identify gaps.
  
  ## Steps
  
  ### 1. Get Interface Methods
  
  Read `core/renderer.interface.js` to list all abstract methods:
  - Methods that throw errors are required
  - Methods with default implementations are optional
  
  ### 2. Check Each Renderer
  
  For each renderer, search for method implementations:
  
  **Web Renderer** (`the-wanderers/web-renderer.js`):
  ```
  grep_search for "async methodName" in web-renderer.js
  ```
  
  **CLI Renderer** (`cli/cli-renderer.js`):
  ```
  grep_search for "async methodName" in cli-renderer.js
  ```
  
  **Discord Renderer** (`discord/discord-renderer.js`):
  ```
  grep_search for "async methodName" in discord-renderer.js
  ```
  
  ### 3. Report Findings
  
  Create a comparison table:
  
  | Method | Interface | Web | CLI | Discord |
  |--------|-----------|-----|-----|---------|
  | displayEvent | ✓ | ✓ | ✓ | ✓ |
  | displayPartyStatus | ✓ | ✓ | ✓ | ✓ |
  | displayInventory | ✓ | ✓ | ✓ | ✓ |
  | promptChoice | ✓ | ✓ | ✓ | ✓ |
  | newFeature | ✓ | ✓ | ❌ | ❌ |
  
  ### 4. Identify Gaps
  
  List any methods that:
  - Are in interface but missing from a renderer (❌)
  - Have different signatures across platforms
  - Are platform-specific (not in interface)
  
  ### 5. Recommendations
  
  Suggest which missing implementations need to be added and in what priority.

variables:
  - name: focus
    description: Specific method or feature to check (optional - checks all if empty)
