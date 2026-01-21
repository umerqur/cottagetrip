/**
 * Formats a date string (YYYY-MM-DD) to a readable format
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param short - Whether to use short format (for mobile)
 * @returns Formatted date string (e.g., "Jan 15" or "1/15")
 */
function formatDate(dateStr: string | null, short: boolean = false): string {
  if (!dateStr) return '—'

  const date = new Date(dateStr + 'T00:00:00') // Parse as local date

  if (short) {
    // Short format for mobile: M/D (e.g., "1/15")
    return `${date.getMonth() + 1}/${date.getDate()}`
  } else {
    // Standard format: Mon D (e.g., "Jan 15")
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month} ${day}`
  }
}

interface TripDatesBadgeProps {
  startDate: string | null
  endDate: string | null
}

export default function TripDatesBadge({ startDate, endDate }: TripDatesBadgeProps) {
  const handleClick = () => {
    // Scroll to trip dates section on Room page
    const element = document.getElementById('trip-dates-section')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const hasDates = startDate && endDate

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-white/70 hover:bg-white/90 hover:border-amber-300 transition cursor-pointer"
      aria-label="View trip dates"
    >
      {/* Calendar Icon */}
      <svg
        className="h-4 w-4 text-amber-600 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>

      {/* Date Range - Full format (hidden on small screens) */}
      {hasDates ? (
        <span className="hidden sm:inline text-sm font-medium text-amber-900">
          {formatDate(startDate, false)} - {formatDate(endDate, false)}
        </span>
      ) : (
        <span className="hidden sm:inline text-sm font-medium text-amber-600">
          Set dates
        </span>
      )}

      {/* Date Range - Short format (visible only on small screens) */}
      {hasDates ? (
        <span className="inline sm:hidden text-xs font-medium text-amber-900">
          {formatDate(startDate, true)}-{formatDate(endDate, true)}
        </span>
      ) : (
        <span className="inline sm:hidden text-xs font-medium text-amber-600">
          Dates
        </span>
      )}
    </button>
  )
}
