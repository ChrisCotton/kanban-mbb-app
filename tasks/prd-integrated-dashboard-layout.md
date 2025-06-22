# Product Requirements Document: Integrated Dashboard Layout

## Introduction/Overview

Transform the existing Kanban board into a comprehensive lifestyle and productivity dashboard that combines task management with motivation, time tracking, and mental bank balance (MBB) calculations. The dashboard will feature a vision board carousel for motivation, integrated timer functionality, and AI-powered journaling to create a holistic system for achieving lifestyle and revenue goals.

**Problem Statement**: Users need a unified interface that combines task management with motivational elements, time tracking, and financial goal tracking to maintain focus on both productivity and lifestyle objectives.

**Goal**: Create an integrated dashboard that motivates users through visual reminders while providing robust productivity tracking and MBB revenue goal achievement.

## Goals

1. **Motivation Enhancement**: Provide visual inspiration through a hero vision board carousel
2. **Integrated Time Tracking**: Seamlessly connect task work sessions with MBB calculations
3. **Goal Achievement**: Enable users to track progress toward MBB revenue targets
4. **Lifestyle Integration**: Combine productivity tracking with lifestyle visualization
5. **Mobile Accessibility**: Ensure full functionality across all device sizes
6. **Data Persistence**: Maintain historical tracking for analytics and insights

## User Stories

1. **As a user**, I want to see inspiring images when I open the dashboard so that I feel motivated to work on my tasks.

2. **As a user**, I want to select a task and start a timer so that I can track how much time I spend and calculate my MBB earnings.

3. **As a user**, I want to see my accumulated MBB balance and progress toward my target so that I know how close I am to achieving my financial goals.

4. **As a user**, I want to view my tasks in a calendar format so that I can see my schedule and due dates at a glance.

5. **As a user**, I want to record audio journal entries and receive AI insights so that I can track my progress and receive personalized recommendations.

6. **As a user**, I want to categorize my tasks with different hourly rates so that I can track which types of activities are most valuable.

7. **As a user**, I want to access the dashboard on my mobile device so that I can track time and view my progress anywhere.

## Functional Requirements

### 1. Hero Section - Vision Board Carousel
1.1. Display a carousel above the existing Kanban board  
1.2. Show one image at a time with smooth fade transitions (no rotation)  
1.3. Auto-advance images with configurable timing (default: 5-7 seconds)  
1.4. Support image upload functionality with gallery management  
1.5. Accept mixed content types: personal photos, goal images, inspirational quotes  
1.6. Provide manual navigation controls (previous/next buttons)  
1.7. Display image counter (e.g., "3 of 12")  

### 2. Navigation Header
2.1. Add navigation links: Kanban, Calendar, Journal, Categories, MBB, VisionBoard  
2.2. Implement Calendar view showing existing tasks by due date  
2.3. Maintain current Kanban board functionality  
2.4. Create placeholder routes for future Journal, Categories, MBB, VisionBoard pages  
2.5. Highlight active page in navigation  
2.6. Ensure responsive navigation (hamburger menu on mobile)  

### 3. Task Categories & Hourly Rates
3.1. Add category field to task creation/editing  
3.2. Allow users to define custom categories with associated hourly rates  
3.3. Display category information in task cards  
3.4. Provide category management interface  
3.5. Calculate MBB earnings based on category hourly rate × time worked  

### 4. MBB Timer Section (Bottom of Dashboard)
4.1. Display active task timer with play/stop/pause/reset controls  
4.2. Show current task name and category  
4.3. Display hourly rate for the active task  
4.4. Show real-time MBB accumulation during timer sessions  
4.5. Persist timer state across page refreshes and navigation  
4.6. Integrate timer start/stop with task status changes  
4.7. Display total accumulated MBB balance  
4.8. Show MBB target balance and percentage achieved  
4.9. Provide visual progress indicator toward target  

### 5. Audio Journal with AI Analysis
5.1. Implement audio recording functionality  
5.2. Generate automatic transcriptions using Whisper AI  
5.3. Allow editing of transcripts in Markdown format  
5.4. Provide AI-powered insights on recorded content  
5.5. Identify trends and patterns in journal entries  
5.6. Generate goal and priority suggestions based on analysis  
5.7. Store audio files and transcripts with timestamps  

### 6. Data Persistence & Analytics
6.1. Persist MBB balance across browser sessions  
6.2. Store historical time tracking data  
6.3. Create analytics dashboard showing:  
   - Daily/weekly/monthly MBB earnings  
   - Time spent by category  
   - Task completion rates  
   - Progress toward revenue targets  
6.4. Export data functionality for external analysis  

### 7. Responsive Design
7.1. Implement mobile-first responsive design  
7.2. Stack components vertically on mobile devices  
7.3. Optimize touch interactions for mobile timer controls  
7.4. Ensure readable text and accessible buttons on all screen sizes  
7.5. Adapt carousel for mobile viewing  

## Non-Goals (Out of Scope)

- Integration with external calendar services (Google Calendar, Outlook) in initial version
- Advanced AI features beyond journal analysis
- Multi-user collaboration features
- Third-party integrations (Instagram, Google Photos) for vision board
- Complex financial reporting beyond basic MBB tracking
- Task automation or smart scheduling

## Design Considerations

### Layout Structure
- **Header**: Navigation bar with responsive menu
- **Hero**: Vision board carousel (full-width, ~300px height)
- **Main**: Existing Kanban board layout
- **Footer**: MBB timer section with earnings display

### Visual Design
- Maintain existing dark theme compatibility
- Use consistent color scheme for MBB elements (green for positive earnings)
- Implement smooth animations for carousel transitions
- Create visual hierarchy that emphasizes the timer and MBB display

### Component Architecture
- Extend existing TaskCard component to include category display
- Create new TimerSection component for bottom dashboard
- Build reusable Carousel component for vision board
- Implement responsive navigation component

## Technical Considerations

### Database Schema Updates
- Add `category_id` field to tasks table
- Create `categories` table with name and hourly_rate fields
- Create `time_sessions` table for tracking work periods
- Add `vision_board_images` table for carousel content
- Create `journal_entries` table for audio recordings and transcripts

### API Endpoints
- `/api/categories` - CRUD operations for task categories
- `/api/time-sessions` - Timer session management
- `/api/mbb` - Mental bank balance calculations and history
- `/api/vision-board` - Image upload and management
- `/api/journal` - Audio recording and transcript management

### Third-Party Integrations
- Whisper AI API for audio transcription
- OpenAI API for journal insights and analysis
- File storage service for audio and image uploads

## Success Metrics

### Primary Metrics
- **MBB Target Achievement**: Percentage of users reaching their revenue goals
- **Daily Active Usage**: Users who start at least one timer session per day
- **Task Completion Rate**: Increase in completed tasks after implementation

### Secondary Metrics
- **Vision Board Engagement**: Average time spent viewing carousel
- **Journal Usage**: Frequency of audio journal entries
- **Mobile Usage**: Percentage of sessions from mobile devices
- **Timer Session Length**: Average duration of work sessions

### Technical Metrics
- **Performance**: Page load time under 3 seconds
- **Reliability**: 99.5% uptime for timer functionality
- **Data Accuracy**: Precise time tracking and MBB calculations

## Open Questions

1. **Target Revenue Setting**: How should users set and modify their MBB revenue targets?
2. **Audio Storage**: What are the storage requirements and limits for audio journal entries?
3. **AI Analysis Frequency**: How often should AI insights be generated (real-time, daily, weekly)?
4. **Category Templates**: Should the system provide default category templates for common work types?
5. **Timer Notifications**: Should the system send notifications for long work sessions or break reminders?
6. **Historical Data Migration**: How should existing task data be handled when adding categories?

## Implementation Priority

### Phase 1: Core Layout & Timer
- Hero carousel section
- Navigation header
- MBB timer section
- Task categories
- Basic responsive design

### Phase 2: Enhanced Features
- Calendar view
- Audio journal functionality
- AI analysis integration

### Phase 3: Analytics & Optimization
- Analytics dashboard
- Advanced insights
- Performance optimization
- Enhanced mobile experience 