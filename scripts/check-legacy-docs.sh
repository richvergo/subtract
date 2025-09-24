#!/bin/bash

# Legacy Documentation Check Script
# This script checks for banned legacy terms in documentation files

set -e

echo "🔍 Checking for banned legacy terms in documentation..."

  # Define banned legacy terms
  BANNED_TERMS=(
    "enhanced-recorder-fixed"
    "use-enhanced-recording"
    "summarize-workflow"
    "Recording Guide"
    "Legacy wizard"
    "create-simple"
    "record-enhanced"
    "record-events"
    "enhanced-action-capturer"
    "context-aware-capturer"
    "video-action-extractor"
    "visual-element-detector"
    "RecordingGuide"
    "EnhancedRecordingStep"
    "ActionCaptureTest"
    "recorder/summarizer"
    "recorder approach"
    "summarizer approach"
    "enhanced summarization"
    "LLM summarization"
    "audio transcripts"
    "voice narration"
    "eventLog"
    "transcript"
  )

# Check all markdown files (excluding archive directory)
FAILED_CHECKS=0

for term in "${BANNED_TERMS[@]}"; do
  echo "Checking for: $term"
  if grep -r -i "$term" --include="*.md" --include="*.MD" --exclude-dir=archive --exclude-dir=node_modules --exclude-dir=.git .; then
    echo "❌ Found banned legacy term: $term"
    FAILED_CHECKS=1
  else
    echo "✅ No instances of: $term"
  fi
done

# Check for legacy API endpoints
echo "Checking for legacy API endpoints..."
LEGACY_ENDPOINTS=(
  "/api/agents/record-enhanced"
  "/api/agents/record-events"
  "/api/agents/[id]/summarize-workflow"
  "/api/agents/[id]/test-workflow"
)

for endpoint in "${LEGACY_ENDPOINTS[@]}"; do
  echo "Checking for: $endpoint"
  if grep -r -i "$endpoint" --include="*.md" --include="*.MD" --exclude-dir=archive --exclude-dir=node_modules --exclude-dir=.git .; then
    echo "❌ Found banned legacy endpoint: $endpoint"
    FAILED_CHECKS=1
  else
    echo "✅ No instances of: $endpoint"
  fi
done

# Check for legacy file references
echo "Checking for legacy file references..."
LEGACY_FILES=(
  "src/lib/enhanced-recorder-fixed.ts"
  "src/lib/hooks/use-enhanced-recording.ts"
  "src/app/agents/create/page.tsx"
  "src/app/agents/create-simple/"
  "src/app/components/RecordingGuide.tsx"
  "src/lib/enhanced-llm-service.ts"
)

for file in "${LEGACY_FILES[@]}"; do
  echo "Checking for: $file"
  if grep -r -i "$file" --include="*.md" --include="*.MD" --exclude-dir=archive --exclude-dir=node_modules --exclude-dir=.git .; then
    echo "❌ Found banned legacy file reference: $file"
    FAILED_CHECKS=1
  else
    echo "✅ No instances of: $file"
  fi
done

if [ $FAILED_CHECKS -eq 1 ]; then
  echo ""
  echo "❌ Legacy documentation check failed!"
  echo "Please remove references to banned legacy terms from documentation."
  echo "Legacy documentation has been moved to archive/docs/ for reference."
  echo ""
  exit 1
else
  echo ""
  echo "✅ All legacy documentation checks passed!"
  echo "No banned legacy terms found in documentation."
  echo ""
fi

# Optional: Check markdownlint compliance if available
if command -v markdownlint &> /dev/null; then
  echo "📝 Checking markdownlint compliance..."
  markdownlint "**/*.md" --ignore node_modules --ignore .git --ignore archive/ || {
    echo "⚠️  Markdownlint found issues. Run 'markdownlint --fix' to auto-fix."
  }
else
  echo "📝 Markdownlint not available. Install with: npm install -g markdownlint-cli"
fi

echo "🎉 Legacy documentation check complete!"
