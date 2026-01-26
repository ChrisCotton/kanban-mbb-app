# Product Requirements Document
## Goals Module — MBB Dashboard

| Field | Value |
|-------|-------|
| **Document Version** | 1.1 |
| **Last Updated** | January 25, 2026 |
| **Author** | Product Team |
| **Status** | Draft |
| **Target Release** | TBD |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [Feature Overview](#5-feature-overview)
6. [Detailed Requirements](#6-detailed-requirements)
7. [User Stories & Acceptance Criteria](#7-user-stories--acceptance-criteria)
8. [Information Architecture](#8-information-architecture)
9. [Wireframes & UI Specifications](#9-wireframes--ui-specifications)
10. [Technical Considerations](#10-technical-considerations)
11. [Dependencies & Integrations](#11-dependencies--integrations)
12. [Testing Strategy](#12-testing-strategy)
13. [Release Plan](#13-release-plan)
14. [Open Questions & Risks](#14-open-questions--risks)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### Overview

The Goals Module introduces a dedicated goal-tracking system to MBB Dashboard, enabling users to define, visualize, and track progress toward medium and long-term objectives. This feature bridges the gap between daily task execution (Kanban) and aspirational outcomes (Vision Board), creating a complete productivity hierarchy.

### Approach

We will implement a **hybrid architecture** consisting of:

1. **Goals Dashboard** (`/goals`) — A dedicated route for comprehensive goal management, progress tracking, and Vision Board image associations
2. **Goals Header Strip** — A compact, ambient goals bar in the Kanban view providing persistent visibility while users manage daily tasks

### Strategic Alignment

This feature supports MBB Dashboard's core value proposition of helping users "organize tasks and track virtual earnings" by adding the missing layer between inspiration (Vision Board) and execution (Tasks). Goals become the connective tissue that gives meaning to daily work.

---

## 2. Problem Statement

### Current State

Users currently manage tasks through a 4-column Kanban board (Backlog → To Do → Doing → Done) and can create inspirational imagery via the Vision Board. However, there is no formal system to:

- Define measurable objectives that tasks contribute toward
- Track progress against medium/long-term outcomes
- Connect Vision Board imagery to actionable targets
- Maintain awareness of "north star" objectives while working on daily tasks

### User Pain Points

| Pain Point | Evidence | Impact |
|------------|----------|--------|
| Tasks feel disconnected from purpose | Users complete tasks without seeing cumulative progress toward larger objectives | Reduced motivation, task fatigue |
| Vision Board lacks actionability | Images are inspirational but not tied to measurable outcomes | Visualization without execution path |
| No goal tracking mechanism | Users must use external tools (Notion, spreadsheets) to track goals | Fragmented workflow, context switching |
| "Busy but not productive" syndrome | High task throughput doesn't translate to meaningful progress | User frustration, churn risk |

### Opportunity

By introducing a Goals Module that integrates with existing systems (Tasks, Vision Board, Categories, MBB financial tracking), we can transform MBB Dashboard from a task manager into a complete goal achievement platform.

---

## 3. Goals & Success Metrics

### Product Goals

| Goal | Description |
|------|-------------|
| **G1** | Enable users to define and track progress toward measurable objectives |
| **G2** | Connect daily tasks to larger goals, providing meaning and motivation |
| **G3** | Integrate Vision Board imagery with actionable targets |
| **G4** | Maintain goal awareness across all views without disrupting existing workflows |

### Success Metrics

| Metric | Current Baseline | Target | Measurement Method |
|--------|------------------|--------|-------------------|
| Goal creation rate | N/A | 70% of active users create ≥1 goal within 14 days | Database query |
| Task-to-goal linking | N/A | 40% of tasks linked to goals | Database query |
| Goal completion rate | N/A | 25% of goals marked complete within target date | Database query |
| Vision Board → Goal conversion | N/A | 50% of Vision Board images linked to goals | Database query |
| Feature retention | N/A | 60% of goal creators return to Goals Dashboard weekly | Analytics |
| User satisfaction (Goals) | N/A | 4.2+ rating in feature survey | In-app survey |

### Non-Goals (Out of Scope for V1)

- Goal sharing/collaboration between users
- AI-powered goal suggestions
- Goal templates library
- Integration with external goal-tracking services
- OKR (Objectives and Key Results) framework implementation
- Goal-based notifications/reminders

---

## 4. User Personas

### Primary Persona: "The Ambitious Creator"

| Attribute | Description |
|-----------|-------------|
| **Name** | Alex |
| **Role** | Freelance developer/creative professional |
| **Goals** | Build a sustainable business, achieve financial targets, maintain work-life balance |
| **Behaviors** | Uses Vision Board daily for motivation, tracks earnings meticulously, manages multiple project categories |
| **Pain Points** | Completes many tasks but loses sight of bigger picture; wants to feel progress toward life goals |
| **Quote** | "I'm busy every day, but am I actually moving toward what matters?" |

### Secondary Persona: "The Side Hustler"

| Attribute | Description |
|-----------|-------------|
| **Name** | Jordan |
| **Role** | Full-time employee building a side project |
| **Goals** | Launch MVP, acquire first customers, eventually transition to full-time entrepreneurship |
| **Behaviors** | Limited time, needs efficient workflows, highly motivated by visual progress |
| **Pain Points** | Scattered tasks across multiple tools; can't see how daily work adds up |
| **Quote** | "Every hour counts. I need to know my limited time is pushing me forward." |

---

## 5. Feature Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MBB DASHBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐    │
│   │   VISION    │      │    GOALS    │      │   KANBAN    │    │
│   │   BOARD     │─────▶│  DASHBOARD  │─────▶│   BOARD     │    │
│   │             │      │             │      │             │    │
│   │ (Inspire)   │      │  (Plan)     │      │ (Execute)   │    │
│   └─────────────┘      └─────────────┘      └─────────────┘    │
│         │                    │                    │             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    GOALS HEADER STRIP                    │  │
│   │              (Ambient visibility in Kanban)              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Feature Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Goals Dashboard | `/goals` (new route) | Primary interface for goal CRUD, progress tracking, and detailed management |
| Goals Header Strip | Kanban view (header area) | Compact ambient display of active goals with progress indicators |
| Goal Creation Modal | Dashboard + Vision Board | Unified modal for creating new goals |
| Goal Detail Panel | Dashboard (slide-out) | Detailed view with linked tasks, progress history, notes |
| Goal Selector Dropdown | Vision Board | Associate existing goals with Vision Board images |

### Goal vs. Task: Key Differences

| Attribute | Goal | Task |
|-----------|------|------|
| **Nature** | Outcome/result to achieve | Discrete action to complete |
| **Timeframe** | Weeks to years | Hours to days |
| **Status Model** | Active → Done (binary) | Backlog → To Do → Doing → Done (workflow) |
| **Movement** | Stationary (no drag between columns) | Draggable across swimlanes |
| **Hierarchy** | Parent (contains tasks) | Child (contributes to goals) |
| **Progress** | Percentage-based or milestone-based | Binary (complete/incomplete) |
| **Visual Association** | Can link to Vision Board images | No image association |

---

## 6. Detailed Requirements

### 6.1 Goal Data Model

#### Goal Entity Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier |
| `title` | String (255) | Yes | Goal name |
| `description` | Text | No | Detailed description (Markdown supported) |
| `status` | Enum | Yes | `active`, `completed`, `archived` |
| `progress_type` | Enum | Yes | `manual`, `task_based`, `milestone_based` |
| `progress_value` | Integer (0-100) | Yes | Current progress percentage |
| `target_date` | Date | No | Target completion date |
| `category_id` | UUID | No | Foreign key to Categories |
| `vision_board_images` | Array[UUID] | No | Linked Vision Board image IDs |
| `color` | String | No | Display color (hex) |
| `icon` | String | No | Icon identifier |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last modification timestamp |
| `completed_at` | Timestamp | No | Completion timestamp |
| `user_id` | UUID | Yes | Owner user ID |
| `order` | Integer | Yes | Display order in lists |

#### Goal-Task Relationship

| Field | Type | Description |
|-------|------|-------------|
| `goal_id` | UUID | Foreign key to Goals |
| `task_id` | UUID | Foreign key to Tasks |
| `contribution_weight` | Integer (1-10) | How much this task contributes to goal progress |

#### Goal Milestones (Optional Sub-entity)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `goal_id` | UUID | Parent goal |
| `title` | String | Milestone name |
| `is_complete` | Boolean | Completion status |
| `order` | Integer | Display order |

### 6.2 Goals Dashboard (`/goals`)

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Goals                          [+ New Goal]  [Filter ▼]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │  [VB Image]      │ │  [VB Image]      │ │      🎯          ││
│  │                  │ │                  │ │   (no image)     ││
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤│
│  │ Launch MVP       │ │ $100K Revenue    │ │ Learn Piano      ││
│  │                  │ │                  │ │                  ││
│  │ ████████████░░░  │ │ ██████░░░░░░░░░  │ │ ██░░░░░░░░░░░░░  ││
│  │ 80%              │ │ 45%              │ │ 15%              ││
│  │                  │ │                  │ │                  ││
│  │ 📅 Feb 19, 2026  │ │ 📅 Mar 1, 2026   │ │ 📅 Dec 31, 2026  ││
│  │ 📋 12 tasks      │ │ 📋 8 tasks       │ │ 📋 3 tasks       ││
│  │ 🏷️ MBB Dev       │ │ 🏷️ Business      │ │ 🏷️ Personal      ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
│                                                                 │
│  ▼ Completed Goals (3)                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ✓ Complete onboarding flow    ✓ Ship v0.1    ✓ First $   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Goal Card Specifications

| Element | Specification |
|---------|---------------|
| **Card Dimensions** | Min-width: 280px, Max-width: 320px |
| **Image Area** | 16:9 aspect ratio, 100% card width, fallback icon if no image |
| **Title** | 18px, Semi-bold, 2-line max with ellipsis |
| **Progress Bar** | 8px height, rounded, colored by progress (green >70%, yellow 30-70%, red <30%) |
| **Progress Text** | 14px, right-aligned with percentage |
| **Due Date** | 14px, calendar icon prefix, red if overdue |
| **Task Count** | 14px, clipboard icon prefix, clickable to expand |
| **Category Badge** | Pill-style, category color, truncate at 12 chars |

#### Interactions

| Action | Behavior |
|--------|----------|
| Click card | Open Goal Detail Panel (slide-out from right) |
| Click "+ New Goal" | Open Goal Creation Modal |
| Drag card | Reorder within active goals (no cross-section drag) |
| Click task count | Expand inline task list preview |
| Click category badge | Filter to show only goals in that category |
| Hover card | Subtle elevation increase (shadow) |

#### Filters & Sorting

| Filter | Options |
|--------|---------|
| Status | All, Active, Completed, Archived |
| Category | All, [Dynamic category list] |
| Due Date | All, Overdue, This Week, This Month, This Quarter, No Date |
| Progress | All, Not Started (0%), In Progress (1-99%), Almost Done (>80%) |

| Sort | Options |
|------|---------|
| Default | Manual order (drag-to-reorder) |
| Due Date | Ascending/Descending |
| Progress | Ascending/Descending |
| Created | Newest/Oldest |
| Title | A-Z/Z-A |

### 6.3 Goal Detail Panel

#### Layout Structure

```
┌────────────────────────────────────────┐
│ [← Back]              [Edit] [Archive] │
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │        [Vision Board Image]        │ │
│ │         (or placeholder)           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Launch MVP for MBB                     │
│ with First 20 Customers                │
│                                        │
│ ████████████████░░░░░░░░░  80%        │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ 📅 Due: Feb 19, 2026  (25 days)  │  │
│ │ 🏷️ Category: MBB Development     │  │
│ │ 📊 Progress: Task-based          │  │
│ │ 🕐 Created: Jan 4, 2026          │  │
│ └──────────────────────────────────┘  │
│                                        │
│ Description                            │
│ ──────────────────────────────────     │
│ Launch the minimum viable product      │
│ with core features and acquire the     │
│ first 20 paying customers at $100/yr.  │
│                                        │
│ Linked Tasks (12)          [+ Link]    │
│ ──────────────────────────────────     │
│ ✓ Set up authentication                │
│ ✓ Build Kanban board                   │
│ ✓ Implement timer feature              │
│ ○ Close out timer & category features  │
│ ○ Fix session history bug              │
│ ○ Implement Vision Board               │
│ ... [Show all 12]                      │
│                                        │
│ Milestones                   [+ Add]   │
│ ──────────────────────────────────     │
│ ✓ Core features complete               │
│ ✓ Beta testing complete                │
│ ○ Production deployment                │
│ ○ First 10 customers                   │
│ ○ First 20 customers                   │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │    [✓ Mark Goal as Complete]     │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

#### Specifications

| Element | Specification |
|---------|---------------|
| Panel Width | 480px fixed, slide-in from right |
| Image | Full-width, max-height 200px, object-fit cover |
| Title | 24px, Bold, multi-line allowed |
| Progress Bar | 12px height, full width |
| Metadata Grid | 2-column layout, icon + label + value |
| Description | Markdown rendered, collapsible if >200 chars |
| Task List | Checkbox + title, linked to actual task, max 5 visible with "Show all" |
| Milestones | Inline checkbox list, drag-to-reorder |
| Complete Button | Full-width, primary action, confirmation dialog |

### 6.4 Goal Creation Modal

#### Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Create New Goal                                          [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Title *                                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Launch MVP with first 20 customers                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Description                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Build and launch the minimum viable product...           │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ Category            │  │ Target Date         │            │
│  │ [MBB Development ▼] │  │ [📅 Feb 19, 2026  ] │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                                │
│  Progress Tracking                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ○ Manual (I'll update progress myself)                   │ │
│  │ ● Task-based (Auto-calculate from linked tasks)          │ │
│  │ ○ Milestone-based (Based on milestone completion)        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Vision Board Image                                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  [Rocket Launch]  [MBB Launch]  [+ Select Image]         │ │
│  │   ✓ Selected                                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Appearance                                                    │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ Color               │  │ Icon                │            │
│  │ [🟣 Purple      ▼]  │  │ [🚀 Rocket      ▼]  │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                                │
│                              [Cancel]  [Create Goal]           │
└────────────────────────────────────────────────────────────────┘
```

#### Field Specifications

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| Title | Text input | Required, 1-255 chars | Empty |
| Description | Textarea | Optional, max 2000 chars, Markdown supported | Empty |
| Category | Dropdown | Optional | User's default category |
| Target Date | Date picker | Optional, must be future date | None |
| Progress Tracking | Radio group | Required | "Manual" |
| Vision Board Image | Multi-select thumbnails | Optional | None |
| Color | Color picker | Optional | System default (purple) |
| Icon | Icon picker | Optional | 🎯 (target) |

### 6.5 Goals Header Strip (Kanban Integration)

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Search tasks...                                   [Filters]  │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 ◀│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │▶ [⚙]  │
│     │ │🚀           │ │💰           │ │🎹           │ │       │
│     │ │Launch MVP   │ │$100K Rev    │ │Learn Piano  │ │       │
│     │ │████████░░ 80│ │█████░░░░ 45 │ │██░░░░░░░ 15 │ │       │
│     │ └─────────────┘ └─────────────┘ └─────────────┘ │       │
├─────────────────────────────────────────────────────────────────┤
│ Backlog (10)    │ To Do (3)    │ Doing (3)     │ Done (4)      │
```

#### Specifications

| Element | Specification |
|---------|---------------|
| Strip Height | 72px |
| Card Width | 140px |
| Card Height | 56px |
| Visible Cards | Dynamic based on viewport (typically 4-6) |
| Navigation | Arrow buttons for horizontal scroll, or swipe on touch |
| Icon | 16px, positioned top-left of card |
| Title | 12px, Semi-bold, 1-line with ellipsis |
| Progress Bar | 4px height, full card width |
| Progress Number | 10px, right-aligned |
| Gear Icon | Opens Goals Dashboard in new tab/navigates to /goals |

#### Interactions

| Action | Behavior |
|--------|----------|
| Click goal card | Filter Kanban to show only tasks linked to this goal |
| Click active filter indicator | Clear filter, show all tasks |
| Double-click goal card | Open Goal Detail Panel overlay |
| Hover goal card | Show tooltip with full title, due date, task count |
| Click ◀/▶ arrows | Scroll goal strip horizontally |
| Click ⚙ gear icon | Navigate to Goals Dashboard |
| Drag goal card | Reorder goals in strip |

#### Filter Behavior

When a goal is selected in the header strip:

1. Kanban columns filter to show only linked tasks
2. Column counts update to reflect filtered counts
3. Visual indicator appears showing active filter: `Filtered by: [Goal Name] ✕`
4. "Add Task" in filtered view auto-links new tasks to selected goal

### 6.6 Vision Board Integration

#### Goal Selector in Vision Board

Add a dropdown component to the Vision Board image creation/upload flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  Upload New Images                                              │
├─────────────────────────────────────────────────────────────────┤
│  Required Information                                           │
│                                                                 │
│  Goal *                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Select or create a goal...                            ▼  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ 🚀 Launch MVP with first 20 customers                    │  │
│  │ 💰 Reach $100K annual revenue                            │  │
│  │ 🎹 Learn to play piano                                   │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ [+ Create New Goal]                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Due Date *                                                     │
│  [One Month                                                ▼]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Behavior

| Action | Behavior |
|--------|----------|
| Select existing goal | Links uploaded image to selected goal |
| Click "+ Create New Goal" | Opens Goal Creation Modal inline |
| Leave empty | Image uploaded without goal association (current behavior) |

#### AI Image Generation Integration

When generating images via AI in Vision Board:

1. Goal field appears in generation form
2. Goal title can optionally be appended to generation prompt for context
3. Generated images auto-link to selected goal

### 6.7 Task-Goal Linking

#### Linking Interface in Task Detail Panel

Add "Goals" section to existing Task Detail Panel:

```
┌────────────────────────────────────────┐
│  Task Details                          │
├────────────────────────────────────────┤
│  ...existing fields...                 │
│                                        │
│  Goals                       [+ Link]  │
│  ──────────────────────────────────    │
│  🚀 Launch MVP              [✕]        │
│                                        │
│  ...rest of panel...                   │
└────────────────────────────────────────┘
```

#### Linking Behavior

| Action | Behavior |
|--------|----------|
| Click "+ Link" | Opens goal selector dropdown |
| Select goal | Creates task-goal relationship |
| Click ✕ | Removes task-goal relationship |
| Task completion | If goal is task-based, progress recalculates |

#### Progress Calculation (Task-Based Goals)

```
progress = (completed_linked_tasks / total_linked_tasks) × 100
```

With weighted contributions:
```
progress = (Σ completed_task_weights / Σ all_task_weights) × 100
```

---
