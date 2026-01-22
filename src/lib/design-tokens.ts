/**
 * Design System Tokens
 * Extracted from the landing page to ensure consistency across the app
 */

export const colors = {
  // Primary brown palette (from landing page)
  brown: {
    dark: '#2F241A',      // Primary text, primary buttons
    darker: '#1F1812',    // Primary button hover
    medium: '#6B5C4D',    // Secondary text
  },
  // Backgrounds
  background: {
    white: '#FFFFFF',
    offWhite: '#FAFAF9',  // Subtle off-white if needed
  },
  // Borders
  border: {
    light: 'rgba(47,36,26,0.1)',   // Subtle borders
    medium: 'rgba(47,36,26,0.2)',  // Medium borders
    dark: '#2F241A',               // Accent borders
  },
  // States
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
  },
  success: {
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#166534',
  },
}

export const spacing = {
  container: {
    maxWidth: '1200px',  // Max width for content containers
    padding: {
      mobile: '1.5rem',  // px-6
      desktop: '2rem',   // px-8
    },
  },
}

export const borderRadius = {
  default: '0.5rem',  // rounded-lg
  card: '0.5rem',     // rounded-lg
  input: '0.5rem',    // rounded-lg
}

export const shadows = {
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',  // shadow-sm
  subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
}
