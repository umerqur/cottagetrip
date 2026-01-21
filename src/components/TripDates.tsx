import { useState, useEffect } from 'react'
import { updateTripDates, validateTripDates } from '../lib/trip-dates'

interface TripDatesProps {
  roomId: string
  isAdmin: boolean
  startDate: string | null
  endDate: string | null
  onDatesUpdated?: (startDate: string | null, endDate: string | null) => void
  showError?: boolean
}

export default function TripDates({
  roomId,
  isAdmin,
  startDate,
  endDate,
  onDatesUpdated,
  showError = false
}: TripDatesProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate || '')
  const [localEndDate, setLocalEndDate] = useState(endDate || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalStartDate(startDate || '')
    setLocalEndDate(endDate || '')
  }, [startDate, endDate])

  // Show validation error when triggered by parent
  useEffect(() => {
    if (showError) {
      const validation = validateTripDates(localStartDate || null, localEndDate || null)
      if (!validation.valid) {
        setError(validation.error)
      }
    }
  }, [showError, localStartDate, localEndDate])

  const handleSave = async (newStartDate: string, newEndDate: string) => {
    if (!isAdmin) return

    setSaving(true)
    setError(null)
    setSaved(false)

    // Validate dates
    const validation = validateTripDates(
      newStartDate || null,
      newEndDate || null
    )

    if (!validation.valid && newStartDate && newEndDate) {
      setError(validation.error)
      setSaving(false)
      return
    }

    // Save to database
    const { dates, error: saveError } = await updateTripDates(
      roomId,
      newStartDate || null,
      newEndDate || null
    )

    setSaving(false)

    if (saveError) {
      setError(saveError)
      return
    }

    if (dates) {
      setError(null)
      setSaved(true)
      onDatesUpdated?.(dates.trip_start_date, dates.trip_end_date)

      // Hide "Saved" message after 2 seconds
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value
    setLocalStartDate(newStartDate)
    setError(null)
    handleSave(newStartDate, localEndDate)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value
    setLocalEndDate(newEndDate)
    setError(null)
    handleSave(localStartDate, newEndDate)
  }

  const hasEmptyDates = !localStartDate || !localEndDate
  const showWarning = isAdmin && hasEmptyDates && !error

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-semibold text-amber-900 whitespace-nowrap">
          Trip dates
        </label>

        <div className="flex items-center gap-3">
          {/* Start Date */}
          {isAdmin ? (
            <div className="relative">
              <input
                type="date"
                value={localStartDate}
                onChange={handleStartDateChange}
                disabled={saving}
                className={`
                  px-3 py-2 rounded-lg border text-sm font-medium transition
                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-wait
                  ${error ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-200 bg-white/70 text-amber-900 hover:border-amber-300 hover:bg-white/90'}
                  ${!localStartDate && !error ? 'border-amber-300 bg-amber-50/50' : ''}
                `}
                placeholder="Start date"
              />
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/30 text-sm font-medium text-amber-900">
              {localStartDate || '—'}
            </div>
          )}

          <span className="text-amber-600 font-medium">to</span>

          {/* End Date */}
          {isAdmin ? (
            <div className="relative">
              <input
                type="date"
                value={localEndDate}
                onChange={handleEndDateChange}
                disabled={saving}
                className={`
                  px-3 py-2 rounded-lg border text-sm font-medium transition
                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-wait
                  ${error ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-200 bg-white/70 text-amber-900 hover:border-amber-300 hover:bg-white/90'}
                  ${!localEndDate && !error ? 'border-amber-300 bg-amber-50/50' : ''}
                `}
                placeholder="End date"
              />
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/30 text-sm font-medium text-amber-900">
              {localEndDate || '—'}
            </div>
          )}

          {/* Status Indicators */}
          {isAdmin && (
            <div className="flex items-center gap-2 min-w-[80px]">
              {saving && (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-amber-600 border-r-transparent"></div>
                  <span className="font-medium">Saving</span>
                </div>
              )}
              {saved && !saving && (
                <div className="flex items-center gap-1.5 text-sm text-green-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Saved</span>
                </div>
              )}
              {showWarning && !saving && !saved && (
                <div className="flex items-center gap-1.5 text-sm text-amber-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Required</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
