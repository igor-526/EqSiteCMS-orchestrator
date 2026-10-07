#!/bin/bash

# Configuration
SERVICES_DIR="services"
MANIFEST_FILE="services.manifest"

# Enable very strict mode
set -Eeuo pipefail

# Parse flags
STRICT_MODE=false
INCLUDE_ROOT=false
REPORT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --include-root)
      INCLUDE_ROOT=true
      shift
      ;;
    --report)
      REPORT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
done

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting services synchronization...${NC}"

# JSON report accumulator
declare -a REPORT_ENTRIES=()

# Error accumulator for strict mode
HAS_ERRORS=false

# Function to add report entry
add_report() {
  local name="$1"
  local repo_path="$2"
  local branch="$3"
  local result="$4"
  local error="${5:-}"
  
  local error_json="null"
  if [[ -n "$error" ]]; then
    # Escape double quotes and newlines for JSON
    error=$(echo "$error" | sed 's/"/\\"/g' | tr '\n' ' ')
    error_json="\"$error\""
  fi
  
  REPORT_ENTRIES+=("{\"name\":\"$name\",\"path\":\"$repo_path\",\"branch\":\"$branch\",\"result\":\"$result\",\"error\":$error_json}")
}

# Function to write report
write_report() {
  if [[ -n "$REPORT_FILE" ]]; then
    # Join entries with commas
    local report_json="["
    for i in "${!REPORT_ENTRIES[@]}"; do
      if [[ $i -gt 0 ]]; then
        report_json+=","
      fi
      report_json+="${REPORT_ENTRIES[$i]}"
    done
    report_json+="]"
    
    echo "$report_json" > "$REPORT_FILE"
  fi
}

# Trap to ensure report is written even on error
trap write_report EXIT

# Sync root if --include-root
if [[ "$INCLUDE_ROOT" == true ]]; then
  if [[ -d .git ]]; then
    echo -e "\n${YELLOW}Syncing root repository...${NC}"
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    
    if [[ "$STRICT_MODE" == true ]]; then
      if git pull --ff-only origin "$current_branch" 2>&1; then
        echo -e "${GREEN}Successfully updated root on branch $current_branch.${NC}"
        add_report "root" "." "$current_branch" "updated" ""
      else
        echo -e "${RED}Failed to update root (strict mode, --ff-only).${NC}" >&2
        add_report "root" "." "$current_branch" "failed" "Pull --ff-only failed"
        HAS_ERRORS=true
      fi
    else
      if git pull origin "$current_branch" 2>&1; then
        echo -e "${GREEN}Successfully updated root on branch $current_branch.${NC}"
        add_report "root" "." "$current_branch" "updated" ""
      else
        echo -e "${RED}Failed to update root.${NC}" >&2
        add_report "root" "." "$current_branch" "failed" "Pull failed"
      fi
    fi
  else
    echo -e "${YELLOW}Root is not a git repository, skipping.${NC}"
  fi
fi

# Ensure directories exist
mkdir -p "$SERVICES_DIR"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}Error: Manifest file '$MANIFEST_FILE' not found.${NC}"
    exit 1
fi

# Function to sync one service
sync_service() {
  local folder="$1"
  local repo_url="$2"
  local target_path="$SERVICES_DIR/$folder"
  
  echo -e "\n${YELLOW}Syncing service:${NC} $folder"
  
  if [ -d "$target_path/.git" ]; then
    echo "Updating existing repository in $target_path..."
    
    # Get current branch
    local current_branch
    current_branch=$(git -C "$target_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    
    # Check if branch exists on remote
    if git -C "$target_path" ls-remote --exit-code --heads origin "$current_branch" > /dev/null 2>&1; then
      if [[ "$STRICT_MODE" == true ]]; then
        # Strict mode: use --ff-only
        if git -C "$target_path" pull --ff-only origin "$current_branch" -q 2>&1; then
          echo -e "${GREEN}Successfully updated $folder on branch $current_branch.${NC}"
          add_report "$folder" "$target_path" "$current_branch" "updated" ""
        else
          echo -e "${RED}Failed to update $folder (strict mode, --ff-only).${NC}" >&2
          add_report "$folder" "$target_path" "$current_branch" "failed" "Pull --ff-only failed"
          HAS_ERRORS=true
        fi
      else
        # Normal mode: regular pull
        if git -C "$target_path" pull origin "$current_branch" -q 2>&1; then
          echo -e "${GREEN}Successfully updated $folder on branch $current_branch.${NC}"
          add_report "$folder" "$target_path" "$current_branch" "updated" ""
        else
          echo -e "${RED}Failed to update $folder. Check local changes or conflicts.${NC}"
          add_report "$folder" "$target_path" "$current_branch" "failed" "Pull failed"
        fi
      fi
    else
      if git -C "$target_path" fetch origin -q 2>&1; then
        echo -e "${YELLOW}Fetched remote for $folder, but branch $current_branch did not exist on remote.${NC}"
        add_report "$folder" "$target_path" "$current_branch" "fetched" "Branch not on remote"
      else
        echo -e "${RED}Failed to fetch $folder.${NC}" >&2
        add_report "$folder" "$target_path" "$current_branch" "failed" "Fetch failed"
        if [[ "$STRICT_MODE" == true ]]; then
          HAS_ERRORS=true
        fi
      fi
    fi
  else
    echo "Cloning new repository to $target_path..."
    if git clone "$repo_url" "$target_path" 2>&1; then
      echo -e "${GREEN}Successfully cloned $folder.${NC}"
      add_report "$folder" "$target_path" "main" "cloned" ""
    else
      echo -e "${YELLOW}Warning: Failed to clone $folder. Continuing...${NC}"
      add_report "$folder" "$target_path" "unknown" "failed" "Clone failed"
      if [[ "$STRICT_MODE" == true ]]; then
        HAS_ERRORS=true
      fi
    fi
  fi
}

# Read manifest line by line, ignoring comments and empty lines
while read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]]; then
        continue
    fi

    # Extract folder name and repo URL
    folder=$(echo "$line" | awk '{print $1}')
    repo_url=$(echo "$line" | awk '{print $2}')

    if [[ -z "$folder" ]] || [[ -z "$repo_url" ]]; then
        echo -e "${YELLOW}Warning: Skipping invalid line in manifest: '$line'${NC}"
        continue
    fi

    sync_service "$folder" "$repo_url"
done < "$MANIFEST_FILE"

if [[ "$HAS_ERRORS" == true ]]; then
  echo -e "\n${RED}Synchronization completed with errors (strict mode).${NC}" >&2
  exit 1
else
  echo -e "\n${GREEN}Synchronization complete!${NC}"
  exit 0
fi
