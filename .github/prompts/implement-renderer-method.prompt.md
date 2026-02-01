name: Implement Renderer Method
description: Add a new method to the renderer interface and all platform implementations
model: claude-sonnet-4-20250514
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - grep_search
  - file_search
  - get_errors

instructions: |
  Add a new method to the renderer interface and implement it across all platforms.
  
  ## Steps
  
  ### 1. Add to Renderer Interface
  
  File: `core/renderer.interface.js`
  
  ```javascript
  /**
   * Description of what the method does
   * @param {Type} paramName - Parameter description
   * @returns {Promise<ReturnType>} - Return description
   */
  async methodName(params) {
      throw new Error('methodName must be implemented by renderer');
      // OR provide a default no-op implementation:
      // Default implementation - does nothing
  }
  ```
  
  ### 2. Implement in Web Renderer
  
  File: `the-wanderers/web-renderer.js`
  
  - Use DOM manipulation
  - Update appropriate div elements
  - Provide fallbacks for missing data
  
  ### 3. Implement in CLI Renderer
  
  File: `cli/cli-renderer.js`
  
  - Use chalk for styling
  - Use console.log for output
  - Use inquirer for prompts
  
  ### 4. Implement in Discord Renderer
  
  File: `discord/discord-renderer.js`
  
  - Use EmbedBuilder for rich content
  - Use ActionRowBuilder for buttons
  - Use StringSelectMenuBuilder for dropdowns
  - Handle interaction collectors for responses
  
  ### 5. Sync Core to Web
  
  ```powershell
  Copy-Item "core/renderer.interface.js" "the-wanderers/core/renderer.interface.js" -Force
  ```

variables:
  - name: methodName
    description: Name of the new renderer method
  - name: purpose
    description: What the method should do
  - name: parameters
    description: What parameters it needs
  - name: returns
    description: What it should return (if anything)
