# Arclight Theme System Guide

## Overview

The Arclight app now uses a centralized theme system that allows you to easily manage all colors across light and dark modes from a single JSON file.

## 🎨 Color Configuration File

**Location:** `constants/colors.json`

This JSON file contains all color definitions for both light and dark themes. The structure is organized by category for easy maintenance:

### Color Categories

```
├── background (primary, secondary, tertiary, cream, dark, modal, overlay, etc.)
├── text (primary, secondary, tertiary, dark, light, cream, gray, etc.)
├── border (primary, secondary, light)
├── button (primary, primaryText, gradient1-3, arclight, etc.)
├── card (background, border)
├── input (background, border, placeholder)
├── status (success, error, warning, info, etc.)
├── icon (default, selected, white, dark)
├── special (premium, logout, yellow, gray, filter, etc.)
├── loader (stroke1, stroke2, stroke3)
├── lighting (background, text, title, button, etc.)
├── auth (background, overlay, text, button, etc.)
└── splash (background, particle, text, tagline, etc.)
```

## 🔧 How to Use the Theme System

### 1. Import the useTheme Hook

```tsx
import { useTheme } from '../context/ThemeContext';
```

### 2. Get Colors in Your Component

```tsx
const MyComponent = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background.primary }}>
      <Text style={{ color: colors.text.primary }}>Hello World</Text>
    </View>
  );
};
```

### 3. Apply Colors Dynamically

**For inline styles:**
```tsx
<View style={[styles.container, { backgroundColor: colors.background.cream }]}>
  <Text style={[styles.title, { color: colors.text.primary }]}>Title</Text>
</View>
```

**For icon colors:**
```tsx
<Plus size={48} strokeWidth={2.5} color={colors.text.cream} />
```

## 📝 Example: Converting Hardcoded Colors

### Before (Hardcoded):
```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8E5D8',
  },
  text: {
    color: '#1A1A1A',
  },
});
```

### After (Using Theme):
```tsx
const MyComponent = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background.cream }]}>
      <Text style={[styles.text, { color: colors.text.dark }]}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Remove backgroundColor here
  },
  text: {
    fontSize: 16,
    // Remove color here
  },
});
```

## 🎯 Common Color Mappings

| Use Case | Color Path | Example |
|----------|-----------|---------|
| Main background | `colors.background.primary` | Screen backgrounds |
| Secondary background | `colors.background.cream` | Card backgrounds |
| Primary text | `colors.text.primary` | Headings, body text |
| Secondary text | `colors.text.secondary` | Subtitles, descriptions |
| Button background | `colors.background.button` | Action buttons |
| Button text | `colors.text.cream` | Text on dark buttons |
| Border | `colors.border.primary` | Input borders, dividers |
| Success state | `colors.status.success` | Success messages |
| Error state | `colors.status.error` | Error messages |
| Icons | `colors.icon.white` | Icon colors |
| Overlay | `colors.background.overlay` | Modal overlays |

## 🌗 Theme Switching

The theme automatically switches between light and dark based on:
1. **System preference** (default)
2. **User selection** (light/dark)

Users can toggle the theme using the theme switcher in the sidebar.

## ✏️ How to Change Colors

### To change a color globally:

1. Open `constants/colors.json`
2. Find the color you want to change (e.g., `background.cream`)
3. Update the hex value for both light and dark themes
4. Save the file
5. All components using that color will update automatically!

### Example: Changing the cream background color

```json
{
  "light": {
    "background": {
      "cream": "#F5F2E8"  // Changed from #E8E5D8
    }
  },
  "dark": {
    "background": {
      "cream": "#3A3A3A"  // Changed from #2A2A2A
    }
  }
}
```

## 🚀 Updated Components

The following components have been updated to use the theme system:
- ✅ `app/(app)/home.tsx`
- ✅ `context/ThemeContext.tsx`
- ✅ `components/ArclightEngineButton.tsx`
- ✅ `components/Sidebar.tsx`

## 📌 Best Practices

1. **Always use theme colors** instead of hardcoded hex values
2. **Remove color properties** from StyleSheet.create() and apply them inline
3. **Use semantic color names** (e.g., `colors.text.primary` instead of `colors.text.dark`)
4. **Test both themes** when making UI changes
5. **Add new colors to colors.json** if needed for new features

## 🔮 Adding New Colors

To add a new color:

1. Add it to `constants/colors.json` under both light and dark themes
2. Use a descriptive name and category
3. Apply it in your components using the useTheme hook

Example:
```json
{
  "light": {
    "special": {
      "newFeature": "#FF5733"
    }
  },
  "dark": {
    "special": {
      "newFeature": "#FF8C66"
    }
  }
}
```

Then use it:
```tsx
<View style={{ backgroundColor: colors.special.newFeature }} />
```

## 🐛 Troubleshooting

**Colors not updating?**
- Make sure you're importing `useTheme` from the correct path
- Check that ThemeProvider wraps your app (should already be setup in `_layout.tsx`)
- Verify the color path exists in `colors.json`
- Try restarting the development server

**TypeScript errors?**
- The types are auto-generated from the JSON file
- If you add new color categories, TypeScript will automatically support them

## 📚 Resources

- Theme Context: `context/ThemeContext.tsx`
- Color Definitions: `constants/colors.json`
- Example Component: `app/(app)/home.tsx`

---

**Note:** This theme system makes it incredibly easy to implement features like:
- Multiple theme options (not just light/dark)
- User-customizable color schemes
- Brand color updates across the entire app
- Accessibility improvements (high contrast modes)
