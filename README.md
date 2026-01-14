# MBB Kanban App

A modern Kanban board application with Mental Bank Balance features built with Next.js and Supabase.

## Features

- 🎯 Drag & Drop Kanban Board
- 💰 Mental Bank Balance tracking
- ⏱️ Time tracking and virtual earnings
- 🎯 Financial goal setting
- ⚡ Real-time updates with Supabase
- 🎨 Glassmorphic UI design
- 🔐 Secure authentication

## MCP Server Usage

This project uses four MCP servers for different purposes:

### 🌐 **browsermcp** - Manual Testing & Development
- Interactive browser tasks
- Manual testing and experiments
- Development debugging
- Ad-hoc automation

### 🎭 **playwright_mcp** - Automated Testing
- Regression testing
- Integration testing
- Automated test suites
- Production automation

### ⚙️ **n8n-mcp** - Workflow Automation
- Learning about n8n nodes and capabilities
- Node documentation and configuration help
- Workflow templates and examples
- Automation planning and troubleshooting

### 📋 **Atlassian** - Project Management
- Jira issue management and tracking
- Confluence documentation access
- Team collaboration workflows
- Sprint planning and bug tracking

**Rule**: Never mix servers of the same type in one workflow. Each maintains separate sessions/state.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

## Testing

This project uses both Playwright for end-to-end (E2E) testing and Jest for unit and regression testing.

### End-to-End (E2E) Testing with Playwright

Playwright is used to test the application from a user's perspective, simulating real user interactions in a browser.

- **Run all E2E tests:**
  ```bash
  npm run test:e2e
  ```
- **Run regression E2E tests:**
  ```bash
  npm run test:regression
  ```

For more detailed information on E2E testing, see the [Playwright testing documentation](./tests/README.md).

### Jest Regression Testing

Jest is used for regression testing of critical components and logic. This suite ensures that core functionalities do not break after code changes.

- **Run the Jest regression test suite:**
  ```bash
  npm run test:regression:jest
  ```

