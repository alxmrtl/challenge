# Challenge Tracker PWA

An elegant, minimalist Progressive Web App for tracking daily habit challenges. Built with a premium dark aesthetic featuring warm maroon and gold accents.

## Features

- **Challenge Setup**: Create customizable challenges with configurable duration, tasks, and point thresholds
- **Daily Tracking**: Beautiful ring progress indicator and smooth task completion
- **Visual Stats**: Heatmap visualizations, point tracking, and performance metrics
- **Archive System**: View past challenge statistics and completion rates
- **PWA Support**: Install to home screen, works offline
- **Mobile-First**: Optimized for phone usage with touch-friendly interactions

## Tech Stack

- Vanilla JavaScript (no frameworks)
- CSS3 with custom design system
- localStorage for data persistence
- Service Worker for offline functionality

## Getting Started

### Local Development

1. Open the project folder
2. Start a local server:
   ```bash
   python3 -m http.server 3000
   ```
3. Open `http://localhost:3000` in your browser
4. For mobile testing, use Chrome DevTools device emulation

### Installation as PWA

1. Open the app in Chrome or Safari on mobile
2. Tap "Add to Home Screen" from the browser menu
3. The app will install and can be launched like a native app

## Usage

1. **Setup Tab**: Create your challenge
   - Set number of days (1-365)
   - Configure point threshold (tasks needed for daily point)
   - Add tasks with emoji, name, and description

2. **Today Tab**: Track daily progress
   - View ring progress indicator
   - Check off completed tasks
   - Navigate between days with arrows

3. **Stats Tab**: View performance
   - Active challenge stats and heatmap
   - Archived challenges list
   - Detailed performance breakdowns

4. **Settings Tab**: Manage challenges
   - Archive current challenge
   - Clear all data

## Design Philosophy

- **Dark Premium**: Deep blacks with warm maroon (#8b2635) and gold (#d4af37) accents
- **Functional Elegance**: Steve Jobs / Jony Ive-inspired simplicity
- **Visual over Numbers**: Leverage heatmaps, rings, and gradients
- **Gamification**: Points, celebrations, smooth animations
- **Brand Unique**: Custom geometric shapes, no standard UI patterns

## Data Structure

Data is stored in localStorage:

- `activeChallenge`: Current challenge configuration (locked once started)
- `completions`: Daily task completion records
- `archive`: Previous completed challenges

## Browser Compatibility

- Chrome/Edge: Full support
- Safari: Full support (iOS 11.3+)
- Firefox: Full support

## License

MIT
