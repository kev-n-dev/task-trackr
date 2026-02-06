# Task Tracker Chrome Extension

A Chrome extension that adds a task tracking toolbar to any webpage, with special integration for Jira tickets.

## Features

- **Task Management**: Add and track tasks with timers
- **Jira Integration**: Automatically extract Jira ticket information and story points
- **Points System**: Earn points based on task completion and story points
- **Workday Progress Bar**: Visual indicator of workday progression (9 AM - 5 PM)
- **Task Reports**: Download detailed reports of your work history
- **Collapsible Toolbar**: Toggle visibility to maximize screen space

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `toolbar-extension` folder
5. The extension will now be active on all pages

## Usage

- **Add Task**: Click the "+ Add" dropdown and select "Add Task"
- **Add Jira Ticket**: On Jira pages, use "+ Add Jira Ticket" to auto-populate ticket info
- **Start/Pause Timer**: Click the play/pause button on any task card
- **Complete Task**: Click the X button to mark a task as done and earn points
- **Download Report**: Access reports through the dropdown menu
- **Toggle Toolbar**: Click the arrow button to collapse/expand the toolbar

## Points System

- Base: 5 points per task
- With Story Points: 5 × Story Points value
- Efficiency bonuses based on completion time

## License

MIT
