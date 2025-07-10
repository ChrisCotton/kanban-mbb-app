# Cursor Rules Directory

## 📁 Organization
This directory contains context-specific rules files that provide additional guidance for different tools and workflows.

## 📋 Available Rules Files

### 🔄 [n8n-mcp-rules.md](./n8n-mcp-rules.md)
**Purpose**: Guidelines for n8n workflow development and n8n-mcp tool usage  
**When Applied**: Automatically when working with n8n workflows, automation, or n8n-mcp tools  
**Key Areas**:
- Workflow design principles
- Node selection strategy  
- Security and authentication
- MBB Kanban specific patterns
- Testing and validation procedures

## 🎯 Usage
These rules files are automatically referenced by the main `.cursorrules` file when specific keywords or tools are detected in conversations.

## 🔄 Adding New Rules
When adding new rules files:
1. Create descriptive filename (e.g., `database-migration-rules.md`)
2. Add entry to this README
3. Reference in main `.cursorrules` if needed
4. Follow the established format and structure

## 📝 File Naming Convention
- Use kebab-case: `tool-name-rules.md`
- Be descriptive and specific
- Include purpose in filename when possible

---
*Generated for MBB Kanban project - part of comprehensive MCP server integration* 