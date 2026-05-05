#!/bin/bash

# Configuration
SERVICES_DIR="services"
MANIFEST_FILE="services.manifest"

# Enable strict mode
set -euo pipefail

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting services synchronization...${NC}"

# Ensure directories exist
mkdir -p "$SERVICES_DIR"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}Error: Manifest file '$MANIFEST_FILE' not found.${NC}"
    exit 1
fi

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

    # Orchestration = монорепа (корень репозитория), не клонируем в services/
    if [[ "$folder" == "orchestration" ]]; then
        echo -e "${YELLOW}Skipping orchestration (this repo is the monorepo root).${NC}"
        continue
    fi

    target_path="$SERVICES_DIR/$folder"

    echo -e "\n${YELLOW}Syncing service:${NC} $folder"
    
    if [ -d "$target_path/.git" ]; then
        echo "Updating existing repository in $target_path..."
        (
            cd "$target_path"
            # Get current branch, fallback to main if it fails
            current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
            
            # Check if branch exists on remote, if not, just pull what we can
            if git ls-remote --exit-code --heads origin "$current_branch" > /dev/null 2>&1; then
                 git pull origin "$current_branch" -q
                 echo -e "${GREEN}Successfully updated $folder on branch $current_branch.${NC}"
            else
                 git fetch origin -q
                 echo -e "${YELLOW}Fetched remote for $folder, but branch $current_branch did not exist on remote.${NC}"
            fi
        ) || {
            echo -e "${RED}Failed to update $folder. Check local changes or conflicts.${NC}"
        }
    else
        echo "Cloning new repository to $target_path..."
        if git clone "$repo_url" "$target_path"; then
            echo -e "${GREEN}Successfully cloned $folder.${NC}"
        else
            echo -e "${YELLOW}Warning: Failed to clone $folder. Continuing...${NC}"
        fi
    fi

done < "$MANIFEST_FILE"

echo -e "\n${GREEN}Synchronization complete!${NC}"
