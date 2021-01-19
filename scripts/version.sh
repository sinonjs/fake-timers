#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.." > /dev/null

PACKAGE_VERSION=$(node -p -e "require('./package.json').version")

echo 'Updating CHANGELOG.md'
git changelog --no-merges
git add CHANGELOG.md

echo 'Updating AUTHORS'
git authors --list > AUTHORS
git add AUTHORS

git commit -m "Updated release files for $PACKAGE_VERSION"
