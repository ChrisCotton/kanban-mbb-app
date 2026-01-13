# Carousel Toggle - Debugging Guide

## Issues Fixed ✅
1. **Infinite Search Loop** - FIXED! Server logs are now quiet.

## Issue to Debug 🔍
2. **Carousel Toggle Not Working** - Carousel remains OFF even after clicking toggle

---

## Manual Testing Steps

### Step 1: Verify Toggle Button Exists

Open your browser's **Developer Console** (F12 or Cmd+Option+I on Mac):

1. Navigate to: http://localhost:3000/dashboard
2. Look for the toggle button in **top-right navigation** (next to user avatar)
3. It should show an **eye-off icon** (carousel OFF by default)

### Step 2: Check localStorage

In the **Console tab**, run:

```javascript
// Check current value
localStorage.getItem('mbb-carousel-enabled')
// Should return: null (first time) or "false"

// Manually set to true
localStorage.setItem('mbb-carousel-enabled', 'true')

// Reload page
location.reload()
// Carousel should now appear at the top!
```

### Step 3: Test Toggle Button

1. **Click the toggle button** (eye-off icon)
2. **Check Console for errors**:
   - Open Console tab
   - Look for any red errors
   - Look for the message about toggle
3. **Check localStorage again**:
   ```javascript
   localStorage.getItem('mbb-carousel-enabled')
   // Should change from "false" to "true" after clicking
   ```

### Step 4: Verify Hook is Working

Add console logs to check hook behavior. Open Console and run:

```javascript
// Check if hook is mounted
window.localStorage.getItem('mbb-carousel-enabled')

// Toggle it manually
window.localStorage.setItem('mbb-carousel-enabled', 'true')

// Force a refresh
window.location.reload()
```

---

## Expected Behavior

### When Carousel is OFF (default):
- ✅ No carousel section at top of dashboard
- ✅ Toggle button shows **eye-off** icon (crossed out)
- ✅ Tooltip says "Carousel: Off"
- ✅ `localStorage.getItem('mbb-carousel-enabled')` returns `"false"` or `null`

### When Carousel is ON:
- ✅ Carousel section appears at top (with vision board images)
- ✅ Toggle button shows **eye** icon (open eye)
- ✅ Tooltip says "Carousel: On"
- ✅ `localStorage.getItem('mbb-carousel-enabled')` returns `"true"`

---

## Common Issues & Fixes

### Issue: Toggle button not visible
**Possible Causes:**
- Component didn't compile
- Navigation component has errors
- Browser cache issue

**Fix:**
```bash
# In terminal:
./restart-dev.sh -f

# In browser:
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Issue: Button visible but clicking does nothing
**Possible Causes:**
- onClick handler not firing
- useCarouselPreference hook error
- localStorage blocked by browser

**Debug in Console:**
```javascript
// Check if localStorage works
try {
  localStorage.setItem('test', 'value')
  localStorage.getItem('test')
  localStorage.removeItem('test')
  console.log('localStorage: WORKING')
} catch(e) {
  console.error('localStorage: BLOCKED', e)
}

// Check hook state
// Open React DevTools → Components → find Navigation
// Look for carouselEnabled value
```

### Issue: Carousel appears but won't hide
**Possible Causes:**
- Layout not re-rendering
- Hook state not updating

**Fix:**
```javascript
// Force clear and reload
localStorage.removeItem('mbb-carousel-enabled')
location.reload()
```

---

## Diagnostic Console Commands

Run these in your browser console:

```javascript
// 1. Check current state
console.log('Carousel enabled:', localStorage.getItem('mbb-carousel-enabled'))

// 2. Check if Navigation component has the hook
// (Requires React DevTools)

// 3. Test toggle functionality
const testToggle = () => {
  const current = localStorage.getItem('mbb-carousel-enabled')
  const newValue = current === 'true' ? 'false' : 'true'
  localStorage.setItem('mbb-carousel-enabled', newValue)
  console.log('Toggled to:', newValue)
  location.reload()
}
testToggle()

// 4. Check if Layout is using the hook
// Open React DevTools → Components → find Layout
// Check props and state

// 5. Force carousel ON for testing
localStorage.setItem('mbb-carousel-enabled', 'true')
location.reload()
```

---

## React DevTools Inspection

If you have React DevTools installed:

1. Open DevTools → **Components** tab
2. Find **Navigation** component
3. Look for:
   - `carouselEnabled` state
   - `toggleCarousel` function
4. Find **Layout** component
5. Look for:
   - `carouselEnabled` from hook
   - Check if carousel is conditionally rendered

---

## Quick Test: Bypass Toggle Button

To verify the carousel itself works:

```javascript
// Manually enable carousel
localStorage.setItem('mbb-carousel-enabled', 'true')
location.reload()

// You should see the carousel at the top
// If you do, the hook works! Issue is with the toggle button.
// If you don't, the Layout component might not be reading the hook.
```

---

## Server-Side Check

The server should NOT be involved (localStorage is client-side only).

But check server logs for any errors:

```bash
tail -50 dev-server.log
```

Look for:
- Compilation errors
- React errors
- Component render errors

---

## What to Report Back

Please run the diagnostic steps and report:

1. **Is the toggle button visible?** (yes/no + screenshot)
2. **What does localStorage show?**
   ```javascript
   localStorage.getItem('mbb-carousel-enabled')
   // Paste result here
   ```
3. **Any console errors?** (screenshot of Console tab)
4. **Does manual localStorage test work?**
   ```javascript
   localStorage.setItem('mbb-carousel-enabled', 'true')
   location.reload()
   // Did carousel appear? (yes/no)
   ```
5. **React DevTools inspection** (if available):
   - `Navigation` component: `carouselEnabled` value?
   - `Layout` component: hook state?

---

## If All Else Fails: Nuclear Option

```bash
# Clear all browser data for localhost:3000
# In browser:
# Settings → Privacy → Clear Browsing Data → Cookies and Site Data

# Clear localStorage manually
localStorage.clear()

# Hard refresh
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Restart dev server
./restart-dev.sh -f
```

Then retry from Step 1.

---

## Files to Check (if you find issues)

1. `hooks/useCarouselPreference.ts` - Hook logic
2. `components/layout/Navigation.tsx` - Toggle button
3. `components/layout/Layout.tsx` - Carousel rendering
4. Browser console - Errors/warnings

---

**Status**: Infinite loop ✅ FIXED | Carousel toggle 🔍 DEBUGGING
