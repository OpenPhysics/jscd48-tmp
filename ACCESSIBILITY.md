# Accessibility Features

This document describes the accessibility features of the jscd48 web interface and provides guidance for users who rely on assistive technologies.

## WCAG Compliance

The jscd48 web interface aims to meet **WCAG 2.1 Level AA** standards for accessibility.

## Keyboard Navigation

### Tab Navigation

- All interactive elements (buttons, inputs, links) are accessible via the Tab key
- Tab order follows a logical flow: header → status bar → tabs → main content → footer
- Shift+Tab navigates backwards

### Skip Links

- Press Tab when the page loads to reveal a "Skip to main content" link
- Activating this link jumps directly to the main application controls

### Focus Indicators

- All focusable elements display a visible focus indicator (pink outline)
- Focus indicators have 3px width and 2px offset for clear visibility

### Keyboard Shortcuts

| Key(s)      | Action                                           |
| ----------- | ------------------------------------------------ |
| Tab         | Move focus to next interactive element           |
| Shift+Tab   | Move focus to previous interactive element       |
| Enter/Space | Activate buttons and toggle controls             |
| Arrow keys  | Adjust range sliders (Trigger Level, DAC Output) |
| Escape      | (Future) Close modals or cancel operations       |

### Interactive Elements

**Buttons:**

- Connect/Disconnect - Connect to CD48 device
- Clear Counts - Reset all channel counters
- Test LEDs - Test device LED indicators
- Refresh Settings - Reload device configuration
- Clear History - Reset time series data
- Export CSV - Download data to file
- Channel toggles - Show/hide channels in chart

**Form Controls:**

- Trigger Level slider (0-4.08V)
- Impedance selector (High-Z / 50 Ohm)
- DAC Output slider (0-4.08V)
- Auto-refresh checkbox
- Time window selector
- Channel visibility toggles

## Screen Reader Support

### ARIA Landmarks

The application uses semantic HTML and ARIA landmarks for navigation:

- `role="banner"` - Header with application title
- `role="navigation"` - Tab navigation
- `role="main"` - Main application content
- `role="region"` - Grouped content areas
- `role="contentinfo"` - Footer information

### ARIA Live Regions

Dynamic content is announced to screen readers:

- **Connection Status** (`aria-live="polite"`) - Announces when device connects/disconnects
- **Channel Counts** (`aria-live="polite"`) - Announces count updates (can be verbose)
- **Activity Log** (`role="log"`) - Announces new log messages
- **Device Status** (`aria-live="polite"`) - Announces firmware version and overflow status
- **Slider Values** (`aria-live="polite"`) - Announces voltage changes as sliders move

### ARIA Labels

All interactive elements have descriptive labels:

```html
<button aria-label="Connect to CD48 device">Connect</button>
<input aria-label="Trigger level voltage, 0 to 4.08 volts" />
<button aria-label="Toggle Channel 0 visibility" aria-pressed="true">
  Ch0 (A)
</button>
```

### Form Labels

All form inputs are properly associated with their labels:

```html
<label for="triggerSlider">Trigger Level</label>
<input id="triggerSlider" type="range" ... />
```

## Visual Accessibility

### Color Contrast

The dark theme provides high contrast ratios:

- **Body text:** #eeeeee on #0f0f1e (17.8:1 - AAA)
- **Headings:** Gradient (pink/blue) provides visual interest without relying solely on color
- **Buttons:** High contrast backgrounds with clear text
- **Status indicators:** Color + text (not color alone) for connection status

### Color Independence

- Connection status uses both color AND text ("Connected" / "Disconnected")
- Status dot changes color but is always accompanied by status text
- Charts use distinct line patterns in addition to colors (future enhancement)

### Text Sizing

- Base font size is 16px (browser default)
- Font sizes are specified in rem units for user scalability
- Text remains readable when zoomed to 200%
- No text is rendered as images

### Focus Visibility

- Custom focus indicators with 3px solid outline
- High contrast color (pink: #e94560)
- 2px offset from element for clarity
- Consistent across all interactive elements

## Assistive Technology Testing

### Tested With:

- ✅ Keyboard-only navigation (Chrome, Firefox, Edge)
- ⏳ NVDA screen reader (Windows) - Partial testing
- ⏳ JAWS screen reader (Windows) - Not yet tested
- ⏳ VoiceOver (macOS/iOS) - Not yet tested
- ⏳ TalkBack (Android) - Not yet tested

### Known Issues:

1. **Chart accessibility** - Canvas-based charts are not fully accessible to screen readers
   - _Workaround:_ Export data to CSV for accessible analysis
   - _Future:_ Add data table view as alternative to chart

2. **Real-time updates** - High-frequency count updates may be overwhelming for screen readers
   - _Workaround:_ Disable auto-refresh for calmer experience
   - _Future:_ Add configurable announcement throttling

3. **Live region verbosity** - Count updates announced frequently
   - _Workaround:_ Screen reader users should adjust verbosity settings
   - _Future:_ Make live region updates configurable

## Browser Compatibility

### Supported Browsers:

- ✅ Chrome 89+ (Windows, macOS, Linux)
- ✅ Edge 89+ (Windows, macOS)
- ✅ Opera 76+ (Windows, macOS, Linux)
- ❌ Firefox (Web Serial API not supported)
- ❌ Safari (Web Serial API not supported)

### Accessibility Features by Browser:

All supported browsers provide:

- Full keyboard navigation
- Screen reader compatibility
- High contrast mode support
- Text zoom capability
- Custom color schemes (via browser extensions)

## User Preferences

### System Preferences Honored:

- `prefers-reduced-motion` - Respects user's motion preferences (animations)
- `prefers-color-scheme` - Dark theme is default (light theme TBD)
- Font size preferences - All text scales with browser zoom
- High contrast mode - Application respects OS high contrast settings

## Usage Tips for Assistive Technology Users

### Screen Reader Users:

1. **Navigate by landmarks** - Use landmark navigation (H key for headings, R for regions)
2. **Forms mode** - Enter forms mode to interact with sliders and inputs
3. **Reduce verbosity** - Consider disabling auto-refresh to reduce announcement frequency
4. **Use CSV export** - For detailed data analysis, export to CSV for accessible spreadsheet review

### Keyboard-Only Users:

1. **Use skip link** - Press Tab immediately on page load to skip to main content
2. **Tab through controls** - All features accessible without mouse
3. **Arrow keys for sliders** - Use arrow keys to fine-tune voltage settings
4. **Space/Enter for buttons** - Both keys activate buttons

### Low Vision Users:

1. **Browser zoom** - Zoom to 200% - layout remains functional
2. **High contrast** - Application works with OS high contrast modes
3. **Focus indicators** - Strong pink outlines show current focus
4. **Large click targets** - Buttons and controls have generous clickable areas

## Future Enhancements

Planned accessibility improvements:

1. **Data Table View** - Alternative to charts for screen reader users
2. **Keyboard Shortcuts** - Global shortcuts for common actions (C for Connect, etc.)
3. **Announcement Throttling** - Configurable rate for live region updates
4. **Light Theme** - High contrast light theme for photosensitivity
5. **Pattern-based Charts** - Line patterns in addition to colors
6. **Accessibility Settings Panel** - User-configurable accessibility options
7. **Audio Feedback** - Optional sound effects for connection/count events
8. **Haptic Feedback** - Vibration support for mobile devices

## Reporting Accessibility Issues

If you encounter accessibility barriers while using jscd48:

1. **Open an issue** on GitHub: https://github.com/OpenPhysics/jscd48-tmp/issues
2. **Use the template** "Accessibility Issue"
3. **Provide details:**
   - Browser and version
   - Assistive technology and version
   - Steps to reproduce
   - Expected vs actual behavior

We are committed to making jscd48 accessible to all users.

## Standards and References

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Web Content Accessibility Guidelines
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) - ARIA design patterns
- [WebAIM](https://webaim.org/) - Accessibility resources and testing tools
- [A11Y Project](https://www.a11yproject.com/) - Community-driven accessibility resources

## Testing Tools

Recommended tools for testing accessibility:

- **axe DevTools** - Browser extension for automated accessibility testing
- **WAVE** - Web accessibility evaluation tool
- **Lighthouse** - Chrome DevTools accessibility audit
- **NVDA** - Free screen reader for Windows
- **Keyboard only** - Unplug your mouse and try navigating!

---

Last updated: 2026-01-16
Maintainer: OpenPhysics Contributors
Contact: https://github.com/OpenPhysics/jscd48-tmp/issues
