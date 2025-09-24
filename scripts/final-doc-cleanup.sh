#!/bin/bash

# Final Documentation Cleanup Script
# This script removes all remaining legacy references from documentation

set -e

echo "🧹 Final documentation cleanup..."

# Files to clean up
FILES=(
  "API_CONTRACT.md"
  "PRD.md"
  "PROJECT_OVERVIEW.md"
  "DEVELOPMENT_GUIDELINES.md"
)

# Backup files before cleanup
echo "📦 Creating backups..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$file.backup"
    echo "  ✅ Backed up $file"
  fi
done

# Remove legacy references from API_CONTRACT.md
echo "🔧 Cleaning API_CONTRACT.md..."
if [ -f "API_CONTRACT.md" ]; then
  # Remove eventLog references
  sed -i '' 's/eventLog/logicSpec/g' API_CONTRACT.md
  sed -i '' 's/transcript/variables/g' API_CONTRACT.md
  sed -i '' 's/voice narration/variable definitions/g' API_CONTRACT.md
  sed -i '' 's/Voice narration transcript/Variable definitions/g' API_CONTRACT.md
  echo "  ✅ Cleaned API_CONTRACT.md"
fi

# Remove legacy references from PRD.md
echo "🔧 Cleaning PRD.md..."
if [ -f "PRD.md" ]; then
  sed -i '' 's/transcript/logicSpec/g' PRD.md
  sed -i '' 's/voice narration/variable definitions/g' PRD.md
  sed -i '' 's/Voice narration transcript/Variable definitions/g' PRD.md
  echo "  ✅ Cleaned PRD.md"
fi

# Remove legacy references from PROJECT_OVERVIEW.md
echo "🔧 Cleaning PROJECT_OVERVIEW.md..."
if [ -f "PROJECT_OVERVIEW.md" ]; then
  sed -i '' 's/transcript/logicSpec/g' PROJECT_OVERVIEW.md
  sed -i '' 's/voice narration/variable definitions/g' PROJECT_OVERVIEW.md
  sed -i '' 's/Voice narration transcript/Variable definitions/g' PROJECT_OVERVIEW.md
  echo "  ✅ Cleaned PROJECT_OVERVIEW.md"
fi

# Remove legacy references from DEVELOPMENT_GUIDELINES.md
echo "🔧 Cleaning DEVELOPMENT_GUIDELINES.md..."
if [ -f "DEVELOPMENT_GUIDELINES.md" ]; then
  # Remove specific legacy patterns
  sed -i '' 's/eventLog/logicSpec/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/transcript/variables/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/voice narration/variable definitions/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/Voice narration transcript/Variable definitions/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/Enhanced Summarization - EventLog Schema/Enterprise Logic Compilation - LogicSpec Schema/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/enhanced summarization pipeline/enterprise logic compilation pipeline/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/structured event logs/natural language rules/g' DEVELOPMENT_GUIDELINES.md
  sed -i '' 's/richer workflow summaries/executable LogicSpec/g' DEVELOPMENT_GUIDELINES.md
  echo "  ✅ Cleaned DEVELOPMENT_GUIDELINES.md"
fi

echo ""
echo "🎉 Final documentation cleanup complete!"
echo "📝 All legacy references have been updated to reflect the new Puppeteer-first enterprise stack"
echo ""
echo "💡 To verify the cleanup, run: ./scripts/check-legacy-docs.sh"
