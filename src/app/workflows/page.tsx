'use client'

import StrategicPuppeteerWorkflowWizard from '../components/workflows/StrategicPuppeteerWorkflowWizard'

/**
 * STRATEGIC PUPPETEER WORKFLOWS PAGE
 * 
 * This page implements the proper Puppeteer-first approach:
 * - NEVER uses mock data or workarounds
 * - ALWAYS uses real Puppeteer browser automation
 * - ALWAYS leverages native Puppeteer APIs
 * - ALWAYS captures real user interactions
 * - ALWAYS uses real performance metrics
 */

export default function WorkflowsPage() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <StrategicPuppeteerWorkflowWizard />
    </div>
  )
}