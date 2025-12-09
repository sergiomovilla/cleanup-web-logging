# Cleanup web logging

A lightweight litter-picking logbook with user accounts, cleanup recording (items, optional location, start/end time), and single-photo uploads.

## Features
- User registration and login with secure password hashing
- Log cleanups with items collected, optional GPS coordinates or manual ward selection
- Capture start and end times, with validation that end is after start
- Optional single photo upload per cleanup entry
- View a dashboard of your past cleanups

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Visit http://localhost:3000 to register and begin logging cleanups.

Environment options:
- `PORT`: port for the web server (defaults to `3000`)
- `SESSION_SECRET`: secret string for session signing (defaults to a development value)

Uploads are saved under `uploads/` and served from `/uploads`.

Built completely by AI
