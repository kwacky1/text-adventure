name: Sync Core to Web
description: Sync the core engine files to the web platform (usually automatic via symlink)
model: claude-sonnet-4-20250514
tools:
  - run_in_terminal
  - read_file
  - list_dir

instructions: |
  The `the-wanderers/core/` directory is a symlink to `/core/`.
  Changes are automatically synced - no manual action needed.
  
  ## Verify Symlink Status
  
  Check if symlink exists and is valid:
  ```powershell
  Get-Item "the-wanderers/core" | Select-Object LinkType, Target
  ```
  
  Expected output:
  ```
  LinkType     Target
  --------     ------
  SymbolicLink core
  ```
  
  ## If Symlink is Broken
  
  Recreate it (requires Windows Developer Mode):
  ```powershell
  Remove-Item -Force "the-wanderers/core"
  New-Item -ItemType SymbolicLink -Path "the-wanderers/core" -Target (Resolve-Path "core").Path
  ```
  
  ## Fallback: Manual Sync
  
  If symlinks aren't available, copy files manually:
  ```powershell
  Remove-Item -Recurse -Force "the-wanderers/core"
  Copy-Item "core" "the-wanderers/core" -Recurse
  ```

variables:
  - name: verify
    description: Just verify symlink status without changing anything
    default: "true"
