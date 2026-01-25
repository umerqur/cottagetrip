/**
 * Formats a date string (YYYY-MM-DD) to MMM d format
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Jun 26")
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'

  const date = new Date(dateStr + 'T00:00:00') // Parse as local date

  // Format as MMM d (e.g., "Jun 26")
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
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
      className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2F241A]/20 bg-white/70 hover:bg-white/90 hover:border-[#2F241A]/40 transition cursor-pointer"
      aria-label="View trip dates"
    >
      {/* Calendar Icon */}
      <svg
        className="h-4 w-4 text-[#2F241A] flex-shrink-0"
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
        <span className="hidden sm:inline text-sm font-medium text-[#2F241A]">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
      ) : (
        <span className="hidden sm:inline text-sm font-medium text-[#2F241A]">
          Set dates
        </span>
      )}

      {/* Date Range - Mobile format (visible only on small screens) */}
      {hasDates ? (
        <span className="inline sm:hidden text-xs font-medium text-[#2F241A]">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
      ) : (
        <span className="inline sm:hidden text-xs font-medium text-[#2F241A]">
          Dates
        </span>
      )}
    </button>
  )
}
