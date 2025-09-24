#!/bin/bash

# Legacy Frontend Check Script
# This script checks for banned legacy frontend components and routes

set -e

echo "🔍 Checking for banned legacy frontend components and routes..."

# Define banned legacy frontend files
BANNED_FRONTEND_FILES=(
  "src/app/agents/create/page.tsx"
  "src/app/components/RecordingGuide.tsx"
  "src/lib/enhanced-llm-service.ts"
  "src/lib/enhanced-recorder-fixed.ts"
  "src/lib/hooks/use-enhanced-recording.ts"
  "src/app/agents/create-simple/"
  "src/app/test-action-capture/"
  "src/app/test-enhanced-capture/"
  "src/components/ActionCaptureTest.tsx"
  "src/components/EnhancedRecordingStep.tsx"
  "src/lib/action-capturer.ts"
  "src/lib/enhanced-action-capturer.ts"
  "src/lib/enhanced-recorder.ts"
  "src/lib/hooks/use-enhanced-action-capture.ts"
  "src/lib/context-aware-capturer.ts"
  "src/lib/video-action-extractor.ts"
  "src/lib/visual-element-detector.ts"
)

# Define banned legacy frontend imports
BANNED_IMPORTS=(
  "enhanced-recorder-fixed"
  "use-enhanced-recording"
  "RecordingGuide"
  "ActionCaptureTest"
  "EnhancedRecordingStep"
  "enhanced-llm-service"
  "action-capturer"
  "enhanced-action-capturer"
  "enhanced-recorder"
  "use-enhanced-action-capture"
  "context-aware-capturer"
  "video-action-extractor"
  "visual-element-detector"
)

# Define banned legacy routes
BANNED_ROUTES=(
  "/agents/create"
  "/agents/create-simple"
  "/test-action-capture"
  "/test-enhanced-capture"
  "/api/agents/record-enhanced"
  "/api/agents/record-events"
  "/api/agents/[id]/summarize-workflow"
  "/api/agents/[id]/test-workflow"
)

FAILED_CHECKS=0

# Check for banned frontend files
echo "Checking for banned frontend files..."
for file in "${BANNED_FRONTEND_FILES[@]}"; do
  echo "Checking for: $file"
  if [ -f "$file" ] || [ -d "$file" ]; then
    echo "❌ Found banned legacy frontend file: $file"
    FAILED_CHECKS=1
  else
    echo "✅ No legacy file found: $file"
  fi
done

# Check for banned imports in source files
echo "Checking for banned imports in source files..."
for import in "${BANNED_IMPORTS[@]}"; do
  echo "Checking for import: $import"
  if grep -r -i "from.*$import\|import.*$import" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/; then
    echo "❌ Found banned legacy import: $import"
    FAILED_CHECKS=1
  else
    echo "✅ No legacy import found: $import"
  fi
done

# Check for banned routes in source files
echo "Checking for banned routes in source files..."
for route in "${BANNED_ROUTES[@]}"; do
  echo "Checking for route: $route"
  if grep -r -i "$route" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/; then
    echo "❌ Found banned legacy route: $route"
    FAILED_CHECKS=1
  else
    echo "✅ No legacy route found: $route"
  fi
done

# Check for imports from archive/frontend/
echo "Checking for imports from archive/frontend/..."
if grep -r -i "from.*archive/frontend\|import.*archive/frontend" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/; then
  echo "❌ Found import from archive/frontend/ - these should not be used in active code"
  FAILED_CHECKS=1
else
  echo "✅ No imports from archive/frontend/ found"
fi

if [ $FAILED_CHECKS -eq 1 ]; then
  echo ""
  echo "❌ Legacy frontend check failed!"
  echo "Please remove references to banned legacy frontend components."
  echo "Legacy frontend files have been moved to archive/frontend/ for reference."
  echo ""
  exit 1
else
  echo ""
  echo "✅ All legacy frontend checks passed!"
  echo "No banned legacy frontend components found."
  echo ""
fi

# Check that new workflow components exist
echo "🔍 Verifying new workflow components exist..."
REQUIRED_COMPONENTS=(
  "src/app/components/workflows/WorkflowReplay.tsx"
  "src/app/components/workflows/LogicEditor.tsx"
  "src/app/components/workflows/RunConsole.tsx"
  "src/app/components/workflows/VariableConfigModal.tsx"
  "src/app/components/workflows/ScheduleEditor.tsx"
  "src/app/components/workflows/LoginConfigForm.tsx"
  "src/app/agents/[id]/review.tsx"
  "src/app/agents/[id]/runs.tsx"
)

MISSING_COMPONENTS=0

for component in "${REQUIRED_COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    echo "✅ Found required component: $component"
  else
    echo "❌ Missing required component: $component"
    MISSING_COMPONENTS=1
  fi
done

if [ $MISSING_COMPONENTS -eq 1 ]; then
  echo ""
  echo "❌ Some required workflow components are missing!"
  echo "Please ensure all new workflow components are present."
  echo ""
  exit 1
else
  echo ""
  echo "✅ All required workflow components are present!"
  echo ""
fi

echo "🎉 Legacy frontend check complete!"
