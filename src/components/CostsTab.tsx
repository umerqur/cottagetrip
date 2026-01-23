import { useEffect, useState } from 'react'
import { RoomMember } from '../lib/supabase'
import { type Profile } from '../lib/profiles'
import {
  listExpenses,
  createExpenseWithSplits,
  updateExpenseWithSplits,
  deleteExpense,
  ensurePinnedCottageRental,
  rebalanceCottageRental,
  getReceiptPublicUrl,
  type ExpenseWithSplits
} from '../lib/expenses'
import ReceiptUpload from './ReceiptUpload'

interface CostsTabProps {
  roomId: string
  roomMembers: RoomMember[]
  memberProfiles: Profile[]
  currentUserId: string | null
  isAdmin: boolean
}

export default function CostsTab({
  roomId,
  roomMembers,
  memberProfiles,
  currentUserId,
  isAdmin
}: CostsTabProps) {
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplits | null>(null)
  const [rebalancingRental, setRebalancingRental] = useState(false)

  useEffect(() => {
    loadExpenses()
  }, [roomId])

  const loadExpenses = async () => {
    setLoading(true)
    const { expenses: expensesData, error } = await listExpenses(roomId)
    if (!error && expensesData) {
      setExpenses(expensesData)

      // Ensure pinned cottage rental exists
      if (currentUserId && isAdmin) {
        const hasPinnedRental = expensesData.some(e => e.is_cottage_rental && e.pinned)
        if (!hasPinnedRental) {
          const memberIds = roomMembers.map(m => m.user_id)
          await ensurePinnedCottageRental(roomId, memberIds, currentUserId)
          // Reload after creating
          const { expenses: refreshed } = await listExpenses(roomId)
          if (refreshed) setExpenses(refreshed)
        }
      }
    }
    setLoading(false)
  }

  const handleRebalanceRental = async (expenseId: string) => {
    if (!confirm('This will redistribute the cottage rental cost equally among all current members. Continue?')) {
      return
    }

    setRebalancingRental(true)
    const memberIds = roomMembers.map(m => m.user_id)
    const { expense, error } = await rebalanceCottageRental(expenseId, memberIds)

    if (error) {
      alert(`Failed to rebalance: ${error}`)
    } else if (expense) {
      setExpenses(expenses.map(e => e.id === expense.id ? expense : e))
    }

    setRebalancingRental(false)
  }

  const pinnedRental = expenses.find(e => e.is_cottage_rental && e.pinned)
  const regularExpenses = expenses.filter(e => !e.is_cottage_rental || !e.pinned)

  // Helper types and functions for settlement calculation
  type NetMap = Record<string, number>

  type Settlement = {
    fromUserId: string
    toUserId: string
    amountCents: number
  }

  function computeNetBalances(expenses: ExpenseWithSplits[]): NetMap {
    const net: NetMap = {}

    for (const exp of expenses) {
      // payer gets credited (they fronted money)
      net[exp.paid_by_user_id] = (net[exp.paid_by_user_id] || 0) - exp.amount_cents

      // each member owes their split
      for (const s of exp.splits) {
        net[s.user_id] = (net[s.user_id] || 0) + s.amount_cents
      }
    }

    // normalize tiny floating stuff (should not happen since cents are ints)
    for (const k of Object.keys(net)) {
      net[k] = Math.round(net[k])
    }

    return net
  }

  function computeSettlements(net: NetMap): Settlement[] {
    const debtors: { userId: string; amountCents: number }[] = []
    const creditors: { userId: string; amountCents: number }[] = []

    for (const [userId, amount] of Object.entries(net)) {
      if (amount > 0) debtors.push({ userId, amountCents: amount })
      if (amount < 0) creditors.push({ userId, amountCents: -amount })
    }

    // biggest first makes results cleaner
    debtors.sort((a, b) => b.amountCents - a.amountCents)
    creditors.sort((a, b) => b.amountCents - a.amountCents)

    const transfers: Settlement[] = []
    let i = 0
    let j = 0

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i]
      const c = creditors[j]
      const pay = Math.min(d.amountCents, c.amountCents)

      if (pay > 0) {
        transfers.push({ fromUserId: d.userId, toUserId: c.userId, amountCents: pay })
        d.amountCents -= pay
        c.amountCents -= pay
      }

      if (d.amountCents === 0) i++
      if (c.amountCents === 0) j++
    }

    return transfers
  }

  function formatMoney(cents: number) {
    return `$${(cents / 100).toFixed(2)}`
  }

  // Derived values for settlement summary
  const net = computeNetBalances(expenses) // includes cottage rental + others
  const settlements = computeSettlements(net)

  const currentNetCents = currentUserId ? (net[currentUserId] || 0) : 0

  const myTransfers = currentUserId
    ? settlements.filter(t => t.fromUserId === currentUserId || t.toUserId === currentUserId)
    : []

  // Cottage summary numbers
  const rentalPaidByName = pinnedRental
    ? (memberProfiles.find(p => p.id === pinnedRental.paid_by_user_id)?.display_name || 'Unknown')
    : null

  const myRentalShareCents = pinnedRental && currentUserId
    ? (pinnedRental.splits.find(s => s.user_id === currentUserId)?.amount_cents || 0)
    : 0

  const adminRentalOwedCents = pinnedRental
    ? pinnedRental.amount_cents - (pinnedRental.splits.find(s => s.user_id === pinnedRental.paid_by_user_id)?.amount_cents || 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Pinned Cottage Rental Card */}
      {pinnedRental && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 backdrop-blur-sm shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="h-6 w-6 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xl font-bold text-amber-900">{pinnedRental.title}</h3>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-amber-900">
                ${(pinnedRental.amount_cents / 100).toFixed(2)}
              </div>
              <div className="text-xs text-amber-700 font-medium">
                {pinnedRental.currency}
              </div>
            </div>
          </div>

          {/* Split Summary */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">Split among {pinnedRental.splits.length} members:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pinnedRental.splits.map(split => {
                const profile = memberProfiles.find(p => p.id === split.user_id)
                return (
                  <div key={split.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-amber-900">{profile?.display_name || 'Unknown'}</span>
                    <span className="text-sm text-amber-700">${(split.amount_cents / 100).toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setEditingExpense(pinnedRental)}
                className="px-4 py-2 text-sm font-medium text-amber-900 bg-white/70 border border-amber-300 rounded-lg hover:border-amber-500 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition"
              >
                Edit Amount
              </button>
              <button
                onClick={() => handleRebalanceRental(pinnedRental.id)}
                disabled={rebalancingRental}
                className="px-4 py-2 text-sm font-medium text-amber-900 bg-white/70 border border-amber-300 rounded-lg hover:border-amber-500 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {rebalancingRental ? 'Rebalancing...' : 'Rebalance Split'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cottage rental quick view (subtle grey) */}
      {pinnedRental && currentUserId && (
        <div className="rounded-xl border border-[rgba(47,36,26,0.10)] bg-[#FAFAF9] shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#2F241A]">Cottage rental</h3>
              <p className="text-sm text-[#6B5C4D] mt-1">Paid by {rentalPaidByName}</p>
              <p className="text-xs text-[#6B5C4D] mt-1">
                Usually paid directly to the admin after booking
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-[#6B5C4D]">Your share</div>
              <div className="text-2xl font-bold text-[#2F241A]">{formatMoney(myRentalShareCents)}</div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-4 border-t border-[rgba(47,36,26,0.08)] pt-4 flex items-center justify-between">
              <div className="text-sm text-[#2F241A]">You are owed for cottage rental</div>
              <div className="text-sm font-semibold text-[#2F241A]">{formatMoney(adminRentalOwedCents)}</div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {currentUserId && expenses.length > 0 && (
        <div className="rounded-xl border border-[rgba(47,36,26,0.12)] bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#2F241A]">Summary</h3>
              <p className="text-sm text-[#6B5C4D] mt-1">
                Includes cottage rental and all other expenses
              </p>
            </div>

            <div className="text-right">
              {currentNetCents > 0 ? (
                <>
                  <div className="text-sm font-semibold text-[#6B5C4D]">You owe</div>
                  <div className="text-2xl font-bold text-[#2F241A]">{formatMoney(currentNetCents)}</div>
                </>
              ) : currentNetCents < 0 ? (
                <>
                  <div className="text-sm font-semibold text-[#6B5C4D]">You are owed</div>
                  <div className="text-2xl font-bold text-[#2F241A]">{formatMoney(Math.abs(currentNetCents))}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-[#6B5C4D]">Status</div>
                  <div className="text-2xl font-bold text-[#2F241A]">Settled</div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-[rgba(47,36,26,0.08)] pt-4">
            <p className="text-sm font-semibold text-[#2F241A] mb-2">Settle up</p>

            {myTransfers.length === 0 ? (
              <p className="text-sm text-[#6B5C4D]">No payments needed right now.</p>
            ) : (
              <div className="space-y-2">
                {myTransfers.map((t, idx) => {
                  const fromName = memberProfiles.find(p => p.id === t.fromUserId)?.display_name || 'Unknown'
                  const toName = memberProfiles.find(p => p.id === t.toUserId)?.display_name || 'Unknown'
                  const isMePaying = t.fromUserId === currentUserId

                  return (
                    <div key={`${t.fromUserId}_${t.toUserId}_${idx}`} className="flex items-center justify-between rounded-lg bg-[rgba(47,36,26,0.05)] px-3 py-2">
                      <div className="text-sm text-[#2F241A]">
                        {isMePaying ? `Pay ${toName}` : `${fromName} pays you`}
                      </div>
                      <div className="text-sm font-semibold text-[#2F241A]">
                        {formatMoney(t.amountCents)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#2F241A]">Other Expenses</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-[#2F241A] px-4 py-2 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 shadow-sm"
        >
          Add Expense
        </button>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2F241A] border-r-transparent"></div>
            <p className="mt-4 text-[#6B5C4D]">Loading expenses...</p>
          </div>
        </div>
      ) : regularExpenses.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[rgba(47,36,26,0.1)] bg-white/50 backdrop-blur-sm py-12 text-center">
          <div className="mb-4 text-5xl">💰</div>
          <h3 className="text-xl font-semibold text-[#2F241A] mb-2">No expenses yet</h3>
          <p className="text-[#6B5C4D]">Click "Add Expense" to track shared costs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {regularExpenses.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              memberProfiles={memberProfiles}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onEdit={() => setEditingExpense(expense)}
              onDelete={async () => {
                if (!confirm('Are you sure you want to delete this expense?')) return
                const { success, error } = await deleteExpense(expense.id)
                if (error) {
                  alert(`Failed to delete: ${error}`)
                } else if (success) {
                  setExpenses(expenses.filter(e => e.id !== expense.id))
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {(showAddModal || editingExpense) && (
        <ExpenseModal
          roomId={roomId}
          roomMembers={roomMembers}
          memberProfiles={memberProfiles}
          currentUserId={currentUserId}
          expense={editingExpense}
          onClose={() => {
            setShowAddModal(false)
            setEditingExpense(null)
          }}
          onSuccess={async (newExpense) => {
            if (editingExpense) {
              setExpenses(expenses.map(e => e.id === newExpense.id ? newExpense : e))
            } else {
              setExpenses([newExpense, ...expenses])
            }
            setShowAddModal(false)
            setEditingExpense(null)
          }}
        />
      )}
    </div>
  )
}

// Expense Card Component
function ExpenseCard({
  expense,
  memberProfiles,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete
}: {
  expense: ExpenseWithSplits
  memberProfiles: Profile[]
  currentUserId: string | null
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const canEdit = isAdmin || expense.created_by_user_id === currentUserId

  const handleViewReceipt = () => {
    if (!expense.receipt_path) return

    const url = getReceiptPublicUrl(expense.receipt_path)

    if (!url) {
      alert('Failed to load receipt URL')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="rounded-xl border border-[rgba(47,36,26,0.1)] bg-white/70 backdrop-blur-sm shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-bold text-[#2F241A] mb-1">{expense.title}</h4>
          <p className="text-sm text-[#6B5C4D]">
            Paid by {expense.paid_by_display_name || 'Unknown'}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-[#2F241A]">
            ${(expense.amount_cents / 100).toFixed(2)}
          </div>
          <div className="text-xs text-[#6B5C4D] font-medium">
            {expense.currency}
          </div>
        </div>
      </div>

      {/* Split Summary */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-[#6B5C4D] mb-2">Split among {expense.splits.length} members:</p>
        <div className="flex flex-wrap gap-2">
          {expense.splits.map(split => {
            const profile = memberProfiles.find(p => p.id === split.user_id)
            return (
              <span key={split.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(47,36,26,0.05)] text-xs text-[#2F241A]">
                {profile?.display_name || 'Unknown'}: ${(split.amount_cents / 100).toFixed(2)}
              </span>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {expense.receipt_path && (
          <button
            onClick={handleViewReceipt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#6B5C4D] hover:text-[#2F241A] transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Receipt
          </button>
        )}

        {canEdit && (
          <>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#6B5C4D] hover:text-[#2F241A] transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Expense Modal Component
function ExpenseModal({
  roomId,
  roomMembers,
  memberProfiles,
  currentUserId,
  expense,
  onClose,
  onSuccess
}: {
  roomId: string
  roomMembers: RoomMember[]
  memberProfiles: Profile[]
  currentUserId: string | null
  expense: ExpenseWithSplits | null
  onClose: () => void
  onSuccess: (expense: ExpenseWithSplits) => void
}) {
  const [title, setTitle] = useState(expense?.title || '')
  const [amountDollars, setAmountDollars] = useState(expense ? (expense.amount_cents / 100).toString() : '')
  const [paidBy, setPaidBy] = useState(expense?.paid_by_user_id || currentUserId || '')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(expense?.splits.map(s => s.user_id) || roomMembers.map(m => m.user_id))
  )
  const [receiptPath, setReceiptPath] = useState<string | null>(expense?.receipt_path || null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate expense ID for receipt upload path
  const [expenseId] = useState(() => crypto.randomUUID())

  const handleMemberToggle = (userId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedMembers(newSelected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUserId) {
      setError('User not authenticated')
      return
    }

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    const amountCents = Math.round(parseFloat(amountDollars) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (!paidBy) {
      setError('Paid by is required')
      return
    }

    if (selectedMembers.size === 0) {
      setError('At least one member must be selected')
      return
    }

    // Receipt required for non-cottage expenses
    if (!receiptPath) {
      setError('Receipt is required')
      return
    }

    // Calculate equal splits
    const selectedArray = Array.from(selectedMembers)
    const baseAmount = Math.floor(amountCents / selectedArray.length)
    const remainder = amountCents % selectedArray.length

    const splits = selectedArray.map((userId, index) => ({
      userId,
      amountCents: baseAmount + (index < remainder ? 1 : 0)
    }))

    setSubmitting(true)
    setError(null)

    if (expense) {
      // Update existing expense
      const { expense: updated, error: updateError } = await updateExpenseWithSplits(expense.id, {
        title,
        amountCents,
        paidByUserId: paidBy,
        receiptPath,
        splits
      })

      if (updateError) {
        setError(updateError)
        setSubmitting(false)
        return
      }

      if (updated) {
        onSuccess(updated)
      }
    } else {
      // Create new expense
      const { expense: created, error: createError } = await createExpenseWithSplits({
        roomId,
        title,
        amountCents,
        currency: 'CAD',
        paidByUserId: paidBy,
        receiptPath,
        isCottageRental: false,
        pinned: false,
        splits,
        expenseId // Use pre-generated ID
      })

      if (createError) {
        setError(createError)
        setSubmitting(false)
        return
      }

      if (created) {
        onSuccess(created)
      }
    }

    setSubmitting(false)
  }

  const isValid = title.trim() && parseFloat(amountDollars) > 0 && paidBy && selectedMembers.size > 0 && receiptPath

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[rgba(47,36,26,0.1)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2F241A]">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[#6B5C4D] hover:text-[#2F241A] transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="expense-title" className="block text-sm font-medium text-[#2F241A] mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="expense-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              placeholder="e.g., Groceries, Gas, Activities"
            />
          </div>

          {/* Amount and Paid By */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-amount" className="block text-sm font-medium text-[#2F241A] mb-2">
                Amount (CAD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5C4D]">$</span>
                <input
                  type="number"
                  id="expense-amount"
                  step="0.01"
                  min="0.01"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] pl-7 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-paid-by" className="block text-sm font-medium text-[#2F241A] mb-2">
                Paid by <span className="text-red-500">*</span>
              </label>
              <select
                id="expense-paid-by"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              >
                <option value="">Select member</option>
                {roomMembers.map(member => {
                  const profile = memberProfiles.find(p => p.id === member.user_id)
                  return (
                    <option key={member.user_id} value={member.user_id}>
                      {profile?.display_name || 'Unknown'}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Members Selection */}
          <div>
            <label className="block text-sm font-medium text-[#2F241A] mb-2">
              Split among <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-[rgba(47,36,26,0.1)] rounded-lg p-3">
              {roomMembers.map(member => {
                const profile = memberProfiles.find(p => p.id === member.user_id)
                const isSelected = selectedMembers.has(member.user_id)

                return (
                  <div key={member.user_id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMemberToggle(member.user_id)}
                        disabled={submitting}
                        className="text-[#2F241A] focus:ring-[#2F241A] rounded"
                      />
                      <span className="text-sm text-[#2F241A]">{profile?.display_name || 'Unknown'}</span>
                    </label>
                  </div>
                )
              })}
            </div>
            {/* Helper text showing equal split calculation */}
            {selectedMembers.size > 0 && amountDollars && parseFloat(amountDollars) > 0 && (
              <p className="mt-2 text-sm text-[#6B5C4D]">
                Split equally: ${parseFloat(amountDollars).toFixed(2)} ÷ {selectedMembers.size} = ${(parseFloat(amountDollars) / selectedMembers.size).toFixed(2)} per person
              </p>
            )}
          </div>

          {/* Receipt Upload */}
          <ReceiptUpload
            roomId={roomId}
            expenseId={expense?.id || expenseId}
            onSuccess={(path) => {
              setReceiptPath(path)
              setReceiptError(null)
            }}
            onError={(err) => setReceiptError(err)}
            disabled={submitting}
          />

          {/* Error Messages */}
          {(error || receiptError) && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error || receiptError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-6 py-2 font-medium text-[#2F241A] hover:bg-[#FAFAF9] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="rounded-lg bg-[#2F241A] px-6 py-2 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-[#1F1812] shadow-sm"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  {expense ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                expense ? 'Update Expense' : 'Create Expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
