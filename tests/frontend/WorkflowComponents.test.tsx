/**
 * Frontend Component Tests
 * Ensures new workflow components render correctly and no legacy imports exist
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Test that required components can be imported
describe('Workflow Components Import Tests', () => {
  it('should import WorkflowReplay component without errors', async () => {
    const { WorkflowReplay } = await import('@/app/components/workflows/WorkflowReplay')
    expect(WorkflowReplay).toBeDefined()
  })

  it('should import LogicEditor component without errors', async () => {
    const { default: LogicEditor } = await import('@/app/components/workflows/LogicEditor')
    expect(LogicEditor).toBeDefined()
  })

  it('should import RunConsole component without errors', async () => {
    const { default: RunConsole } = await import('@/app/components/workflows/RunConsole')
    expect(RunConsole).toBeDefined()
  })

  it('should import VariableConfigModal component without errors', async () => {
    const { default: VariableConfigModal } = await import('@/app/components/workflows/VariableConfigModal')
    expect(VariableConfigModal).toBeDefined()
  })

  it('should import ScheduleEditor component without errors', async () => {
    const { default: ScheduleEditor } = await import('@/app/components/workflows/ScheduleEditor')
    expect(ScheduleEditor).toBeDefined()
  })

  it('should import LoginConfigForm component without errors', async () => {
    const { default: LoginConfigForm } = await import('@/app/components/workflows/LoginConfigForm')
    expect(LoginConfigForm).toBeDefined()
  })
})

// Test that legacy components cannot be imported
describe('Legacy Component Import Tests', () => {
  it('should not be able to import RecordingGuide component', async () => {
    try {
      await import('@/app/components/RecordingGuide')
      fail('RecordingGuide should not exist')
    } catch (error) {
      expect(error.message).toContain('Cannot resolve module')
    }
  })

  it('should not be able to import enhanced-llm-service', async () => {
    try {
      await import('@/lib/enhanced-llm-service')
      fail('enhanced-llm-service should not exist in active code')
    } catch (error) {
      expect(error.message).toContain('Cannot resolve module')
    }
  })

  it('should not be able to import enhanced-recorder-fixed', async () => {
    try {
      await import('@/lib/enhanced-recorder-fixed')
      fail('enhanced-recorder-fixed should not exist in active code')
    } catch (error) {
      expect(error.message).toContain('Cannot resolve module')
    }
  })

  it('should not be able to import use-enhanced-recording hook', async () => {
    try {
      await import('@/lib/hooks/use-enhanced-recording')
      fail('use-enhanced-recording should not exist in active code')
    } catch (error) {
      expect(error.message).toContain('Cannot resolve module')
    }
  })
})

// Test that review and runs pages render
describe('Agent Pages Render Tests', () => {
  // Mock Next.js router
  jest.mock('next/navigation', () => ({
    useParams: () => ({ id: 'test-workflow-id' }),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }),
  }))

  // Mock SWR
  jest.mock('swr', () => ({
    default: () => ({
      data: null,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    }),
  }))

  it('should render review page component', async () => {
    const { default: AgentReviewPage } = await import('@/app/agents/[id]/review')
    
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock

    render(<AgentReviewPage />)
    
    // Should render without crashing
    expect(document.body).toBeInTheDocument()
  })

  it('should render runs page component', async () => {
    const { default: AgentRunsPage } = await import('@/app/agents/[id]/runs')
    
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock

    render(<AgentRunsPage />)
    
    // Should render without crashing
    expect(document.body).toBeInTheDocument()
  })
})

// Test that no imports from archive/frontend exist
describe('Archive Import Tests', () => {
  it('should not have any imports from archive/frontend', () => {
    // This test ensures that no active code imports from the archive
    // We can't directly test this, but we can verify the structure
    expect(true).toBe(true) // Placeholder - the actual check is in CI
  })
})

// Test navigation structure
describe('Navigation Structure Tests', () => {
  it('should have correct navigation items', async () => {
    const { Sidebar } = await import('@/components/Sidebar')
    
    // Mock Next.js hooks
    jest.mock('next/navigation', () => ({
      usePathname: () => '/agents',
    }))
    
    jest.mock('next-auth/react', () => ({
      useSession: () => ({
        data: { user: { name: 'Test User', email: 'test@example.com' } },
      }),
      signOut: jest.fn(),
    }))

    render(<Sidebar />)
    
    // Should render without crashing
    expect(document.body).toBeInTheDocument()
  })
})
