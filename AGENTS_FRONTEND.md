# Agents Frontend

## Overview

A minimal React/Next.js frontend for the Agents automation system, built with Tailwind CSS and modern UI components. Provides a complete user interface for managing logins, creating agents, and reviewing automation runs.

## Features

### 🏠 Dashboard
- **Overview Statistics**: Total agents, active agents, draft agents, saved logins
- **Quick Actions**: Direct links to manage agents, logins, and run workflows
- **Recent Agents**: List of recently created agents with status and run history

### 🔑 Logins Management
- **Login List**: View all saved logins with masked credentials
- **Add Login Modal**: Create new login credentials with system type selection
- **Delete Logins**: Remove unwanted login entries
- **Security**: All credentials are encrypted and masked in the UI

### 🤖 Agents Management
- **Agent List**: View all agents with status (DRAFT/ACTIVE) and last run status
- **Create Agent**: Browser-based recording with purpose prompt and LLM annotation
- **Agent Details**: View configuration, run history, and manage executions

### 📊 Run Management
- **Run History**: Complete table of all agent executions
- **Run Details Modal**: View screenshots, logs, and execution details
- **Confirmation System**: Confirm or reject runs with feedback
- **Agent Activation**: Move agents from DRAFT to ACTIVE status

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Data Fetching**: SWR for caching and revalidation
- **TypeScript**: Full type safety
- **API Integration**: Custom API helpers with error handling

## File Structure

```
src/
├── app/
│   ├── components/
│   │   └── AgentsSidebar.tsx          # Navigation sidebar
│   ├── logins/
│   │   └── page.tsx                   # Logins management page
│   ├── agents/
│   │   ├── page.tsx                   # Agents list page
│   │   └── [id]/
│   │       └── page.tsx               # Agent detail page
│   ├── globals.css                    # Global styles with Tailwind
│   ├── layout.tsx                     # Root layout
│   └── page.tsx                       # Dashboard page
├── lib/
│   ├── api.ts                         # API helper functions
│   └── utils.ts                       # Utility functions (cn, etc.)
└── ...
```

## API Integration

### API Helper Functions (`/lib/api.ts`)

```typescript
// Logins API
loginsApi.getAll()           // Get all logins
loginsApi.create(data)       // Create new login
loginsApi.delete(id)         // Delete login

// Agents API
agentsApi.getAll()           // Get all agents
agentsApi.getById(id)        // Get agent by ID
agentsApi.create(data)       // Create agent manually
// Browser recording creates agents directly via /api/agents/record
agentsApi.run(id)            // Trigger agent run
agentsApi.getRuns(id)        // Get agent run history

// Agent Runs API
agentRunsApi.confirm(id, data) // Confirm run
agentRunsApi.reject(id, data)  // Reject run with feedback
```

### Data Fetching with SWR

```typescript
// Automatic caching and revalidation
const { data: agents, error, mutate } = useSWR('agents', agentsApi.getAll);

// Optimistic updates
const handleDelete = async (id) => {
  await loginsApi.delete(id);
  mutate(logins?.filter(login => login.id !== id), false);
};
```

## UI Components

### Sidebar Navigation
- **Dashboard**: Overview and quick actions
- **Logins**: Manage login credentials
- **Agents**: Manage automation agents
- **Active State**: Highlights current page

### Modal Components
- **Add Login Modal**: Form for creating new logins
- **Create Agent Modal**: Browser recording interface with purpose prompt
- **Run Detail Modal**: Comprehensive run information with confirmation actions

### Status Indicators
- **Agent Status**: DRAFT (yellow), ACTIVE (green)
- **Run Status**: PENDING (blue), SUCCESS (green), FAILED (red)
- **Confirmation Status**: Confirmed (green), Rejected (red), Pending (yellow)

## User Workflows

### 1. Creating an Agent from Browser Recording
1. Navigate to Agents page
2. Click "Create Agent"
3. Fill in agent name and purpose prompt
4. Use browser recording to capture workflow steps
5. System automatically generates agent configuration with LLM annotations
6. Agent created with DRAFT status

### 2. Running and Confirming an Agent
1. Go to Agent detail page
2. Click "Run Now" (only for ACTIVE agents)
3. Monitor run status in history table
4. Click "View" on completed run
5. Review screenshot and logs
6. Confirm (✅) or Reject (❌) with feedback
7. Optionally activate agent to ACTIVE status

### 3. Managing Logins
1. Navigate to Logins page
2. Click "Add Login" to create new credentials
3. Fill in system type, username, password
4. View masked credentials in list
5. Delete unwanted logins

## Responsive Design

- **Mobile-First**: Optimized for all screen sizes
- **Grid Layouts**: Responsive cards and tables
- **Touch-Friendly**: Large buttons and touch targets
- **Sidebar**: Collapsible on mobile devices

## Error Handling

- **API Errors**: Graceful error messages with retry options
- **Validation**: Form validation with helpful error messages
- **Loading States**: Spinners and disabled states during operations
- **Network Issues**: SWR handles reconnection and retries

## Security Features

- **Credential Masking**: All sensitive data is masked in UI
- **RBAC**: Respects user permissions from backend
- **Input Validation**: Client-side validation with Zod schemas
- **XSS Protection**: Sanitized inputs and safe rendering

## Performance Optimizations

- **SWR Caching**: Automatic data caching and background updates
- **Optimistic Updates**: Immediate UI feedback for better UX
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js automatic image optimization

## Development Setup

### Prerequisites
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

## Customization

### Styling
- **Tailwind Classes**: Use utility classes for styling
- **Custom Components**: Reusable components in `/components`
- **Theme**: Customize colors and fonts in `tailwind.config.js`

### Adding New Features
1. Create API functions in `/lib/api.ts`
2. Add UI components in `/app/components/`
3. Create pages in `/app/[feature]/page.tsx`
4. Update sidebar navigation in `AgentsSidebar.tsx`

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Chrome Mobile
- **Features**: ES2020+, CSS Grid, Flexbox

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML and ARIA labels
- **Color Contrast**: WCAG AA compliant color schemes
- **Focus Management**: Clear focus indicators

## Future Enhancements

### Planned Features
1. **Real-time Updates**: WebSocket integration for live run status
2. **Advanced Filtering**: Search and filter agents/logins
3. **Bulk Operations**: Select multiple items for batch actions
4. **Export/Import**: Backup and restore configurations
5. **Analytics Dashboard**: Run statistics and performance metrics

### UI Improvements
1. **Dark Mode**: Toggle between light and dark themes
2. **Customizable Dashboard**: Drag-and-drop widget arrangement
3. **Advanced Modals**: More sophisticated modal interactions
4. **Toast Notifications**: Better feedback for user actions

This frontend provides a complete, production-ready interface for the Agents automation system, enabling users to easily manage their automation workflows from creation to execution and review.
