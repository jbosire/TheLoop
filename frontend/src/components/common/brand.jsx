// TheLoop Brand Assets
// Usage: import { LogoFull, LogoCompact, LogoIcon, brandColors } from '../brand'

export const brandColors = {
  primaryPurple: '#534AB7',
  accentBlue: '#378ADD',
  lightPurple: '#7F77DD',
  surfacePurple: '#EEEDFE',
  surfaceBlue: '#E6F1FB',
  darkPurple: '#3C3489',
  darkBlue: '#185FA5',
  // Dark theme variants
  darkThemePurple: '#AFA9EC',
  darkThemeBlue: '#85B7EB',
}

// Full logo — login page, register page, large headers
export function LogoFull({ className = '', width = 240 }) {
  const scale = width / 240
  const height = 56 * scale
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 56"
      fill="none"
      className={className}
      aria-label="TheLoop"
    >
      <path
        d="M16 28c0-9 7-16 16-16s16 7 16 16-7 16-16 16-16-7-16-16z"
        stroke="#534AB7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M48 28c0-9 7-16 16-16s16 7 16 16-7 16-16 16-16-7-16-16z"
        stroke="#378ADD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 12c5 5 5 27 0 32"
        stroke="#534AB7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M48 12c-5 5-5 27 0 32"
        stroke="#378ADD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text
        x="92"
        y="35"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="24"
        fontWeight="500"
        fill="currentColor"
      >
        The
        <tspan fill="#534AB7" fontWeight="500">
          Loop
        </tspan>
      </text>
    </svg>
  )
}

// Compact logo — sidebar header, mobile, small spaces
export function LogoCompact({ className = '', width = 120 }) {
  const scale = width / 120
  const height = 36 * scale
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 36"
      fill="none"
      className={className}
      aria-label="TheLoop"
    >
      <path
        d="M6 18c0-6 4.5-11 11-11s11 5 11 11-4.5 11-11 11S6 24 6 18z"
        stroke="#534AB7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M28 18c0-6 4.5-11 11-11s11 5 11 11-4.5 11-11 11-11-5-11-11z"
        stroke="#378ADD"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 7c3.5 3.5 3.5 18.5 0 22"
        stroke="#534AB7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M28 7c-3.5 3.5-3.5 18.5 0 22"
        stroke="#378ADD"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="54"
        y="23"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="16"
        fontWeight="500"
        fill="currentColor"
      >
        The
        <tspan fill="#534AB7" fontWeight="500">
          Loop
        </tspan>
      </text>
    </svg>
  )
}

// Icon only — favicon, loading states, avatar placeholder
export function LogoIcon({ className = '', size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="TheLoop"
    >
      <path
        d="M8 24c0-7.5 5.5-13.5 13-13.5s13 6 13 13.5-5.5 13.5-13 13.5S8 31.5 8 24z"
        stroke="#534AB7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M27 24c0-7.5 5.5-13.5 13-13.5"
        stroke="#378ADD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M40 37.5c-7.5 0-13-6-13-13.5"
        stroke="#378ADD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M21 10.5c3.5 4 3.5 23 0 27"
        stroke="#534AB7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M27 10.5c-3.5 4-3.5 23 0 27"
        stroke="#378ADD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
