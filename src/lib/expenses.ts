import { getSupabase } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'

export type Expense = {
  id: string
  room_id: string
  title: string
  amount_cents: number
  currency: string
  paid_by_user_id: string
  created_by_user_id: string
  receipt_path: string | null
  is_cottage_rental: boolean
  pinned: boolean
  created_at: string
  updated_at: string
}

export type ExpenseSplit = {
  id: string
  expense_id: string
  user_id: string
  amount_cents: number
  created_at: string
}

export type ExpenseWithSplits = Expense & {
  splits: ExpenseSplit[]
  paid_by_display_name?: string
}

export type RentalPayment = {
  id: string
  room_id: string
  user_id: string
  amount_cents: number
  paid: boolean
  paid_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Gets all expenses for a room with their splits
 */
export async function listExpenses(roomId: string): Promise<{ expenses: ExpenseWithSplits[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { expenses: [], error: SUPABASE_ERROR_MESSAGE }
    }

    // Fetch expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return { expenses: [], error: expensesError.message }
    }

    if (!expensesData || expensesData.length === 0) {
      return { expenses: [], error: null }
    }

    // Fetch all splits for these expenses
    const expenseIds = expensesData.map(e => e.id)
    const { data: splitsData, error: splitsError } = await supabase
      .from('expense_splits')
      .select('*')
      .in('expense_id', expenseIds)

    if (splitsError) {
      console.error('Error fetching expense splits:', splitsError)
      return { expenses: [], error: splitsError.message }
    }

    // Fetch user profiles for display names
    const userIds = [...new Set(expensesData.map(e => e.paid_by_user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)

    const profileMap = new Map(profilesData?.map(p => [p.id, p.display_name]) || [])

    // Combine expenses with their splits
    const expenses: ExpenseWithSplits[] = expensesData.map(expense => ({
      ...expense,
      splits: splitsData?.filter(split => split.expense_id === expense.id) || [],
      paid_by_display_name: profileMap.get(expense.paid_by_user_id) || 'Unknown'
    }))

    return { expenses, error: null }
  } catch (err) {
    console.error('Unexpected error fetching expenses:', err)
    return { expenses: [], error: 'Unexpected error occurred' }
  }
}

/**
 * Creates an expense with splits using atomic RPC function
 */
export async function createExpenseWithSplits(payload: {
  roomId: string
  title: string
  amountCents: number
  currency: string
  paidByUserId: string
  receiptPath: string | null
  isCottageRental: boolean
  pinned: boolean
  splits: { userId: string; amountCents: number }[]
  expenseId?: string // Optional pre-generated ID for receipt upload
}): Promise<{ expense: ExpenseWithSplits | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { expense: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { expense: null, error: 'User not authenticated' }
    }

    // Validate splits sum equals amount
    const splitsSum = payload.splits.reduce((sum, split) => sum + split.amountCents, 0)
    if (splitsSum !== payload.amountCents) {
      return { expense: null, error: 'Splits must sum to expense amount' }
    }

    // Generate expense ID if not provided
    const expenseId = payload.expenseId || crypto.randomUUID()

    // Extract member IDs from splits
    const memberIds = payload.splits.map(s => s.userId)

    // DEBUG: Log payload before RPC call
    console.log('create expense payload', {
      expenseId,
      roomId: payload.roomId,
      title: payload.title,
      amountCents: payload.amountCents,
      paidByUserId: payload.paidByUserId,
      memberIds,
      receiptPath: payload.receiptPath,
      isCottageRental: payload.isCottageRental,
      pinned: payload.pinned
    })

    // Call atomic RPC function
    const { data, error } = await supabase.rpc('upsert_expense_with_splits', {
      p_expense_id: expenseId,
      p_room_id: payload.roomId,
      p_title: payload.title,
      p_amount_cents: payload.amountCents,
      p_paid_by_user_id: payload.paidByUserId,
      p_selected_member_ids: memberIds,
      p_receipt_path: payload.receiptPath,
      p_is_cottage_rental: payload.isCottageRental,
      p_pinned: payload.pinned
    })

    // DEBUG: Log result after RPC call
    console.log('create expense result', { data, error })

    if (error) {
      console.error('Error creating expense:', error)
      return { expense: null, error: error.message }
    }

    // Parse the JSON result
    const result = data as { expense: Expense; splits: ExpenseSplit[] }

    return {
      expense: {
        ...result.expense,
        splits: result.splits
      },
      error: null
    }
  } catch (err) {
    console.error('Unexpected error creating expense:', err)
    return { expense: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Updates an expense and replaces its splits using atomic RPC function
 */
export async function updateExpenseWithSplits(
  expenseId: string,
  payload: {
    title?: string
    amountCents?: number
    paidByUserId?: string
    receiptPath?: string | null
    splits?: { userId: string; amountCents: number }[]
  }
): Promise<{ expense: ExpenseWithSplits | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { expense: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Fetch current expense to get missing fields
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (fetchError || !currentExpense) {
      return { expense: null, error: 'Expense not found' }
    }

    // Use current values as defaults for undefined fields
    const title = payload.title ?? currentExpense.title
    const amountCents = payload.amountCents ?? currentExpense.amount_cents
    const paidByUserId = payload.paidByUserId ?? currentExpense.paid_by_user_id
    const receiptPath = payload.receiptPath !== undefined ? payload.receiptPath : currentExpense.receipt_path

    // Validate splits sum if provided
    if (payload.splits && payload.amountCents !== undefined) {
      const splitsSum = payload.splits.reduce((sum, split) => sum + split.amountCents, 0)
      if (splitsSum !== payload.amountCents) {
        return { expense: null, error: 'Splits must sum to expense amount' }
      }
    }

    // If splits not provided, fetch current splits
    let memberIds: string[]
    if (payload.splits) {
      memberIds = payload.splits.map(s => s.userId)
    } else {
      const { data: currentSplits } = await supabase
        .from('expense_splits')
        .select('user_id')
        .eq('expense_id', expenseId)
      memberIds = currentSplits?.map(s => s.user_id) || []
    }

    // Call atomic RPC function
    const { data, error } = await supabase.rpc('upsert_expense_with_splits', {
      p_expense_id: expenseId,
      p_room_id: currentExpense.room_id,
      p_title: title,
      p_amount_cents: amountCents,
      p_paid_by_user_id: paidByUserId,
      p_selected_member_ids: memberIds,
      p_receipt_path: receiptPath,
      p_is_cottage_rental: currentExpense.is_cottage_rental,
      p_pinned: currentExpense.pinned
    })

    if (error) {
      console.error('Error updating expense:', error)
      return { expense: null, error: error.message }
    }

    // Parse the JSON result
    const result = data as { expense: Expense; splits: ExpenseSplit[] }

    return {
      expense: {
        ...result.expense,
        splits: result.splits
      },
      error: null
    }
  } catch (err) {
    console.error('Unexpected error updating expense:', err)
    return { expense: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Deletes an expense (and its splits via cascade)
 */
export async function deleteExpense(expenseId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, error: SUPABASE_ERROR_MESSAGE }
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      console.error('Error deleting expense:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error deleting expense:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Ensures pinned cottage rental expense exists for a room
 * Auto-populates from selected cottage's total_price if available
 */
export async function ensurePinnedCottageRental(
  roomId: string,
  memberIds: string[],
  adminUserId: string,
  totalPriceCents?: number
): Promise<{ expense: ExpenseWithSplits | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { expense: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Check for existing pinned rental
    const { data: existing, error: checkError } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('room_id', roomId)
      .eq('is_cottage_rental', true)
      .eq('pinned', true)
      .single()

    if (!checkError && existing) {
      return {
        expense: {
          ...existing,
          splits: existing.expense_splits || []
        },
        error: null
      }
    }

    // Use provided totalPriceCents or default to 0
    const rentalAmount = totalPriceCents ?? 0

    // Calculate equal splits with fair remainder distribution
    const baseAmount = Math.floor(rentalAmount / memberIds.length)
    const remainder = rentalAmount % memberIds.length

    const splits = memberIds.map((userId, index) => ({
      userId,
      amountCents: baseAmount + (index < remainder ? 1 : 0)
    }))

    // Create the pinned expense
    const result = await createExpenseWithSplits({
      roomId,
      title: 'Cottage Rental',
      amountCents: rentalAmount,
      currency: 'CAD',
      paidByUserId: adminUserId,
      receiptPath: null, // Receipt is optional for cottage rental
      isCottageRental: true,
      pinned: true,
      splits
    })

    // If successful and amount > 0, create rental_payments records
    if (result.expense && rentalAmount > 0) {
      const rentalPayments = splits.map(split => ({
        room_id: roomId,
        user_id: split.userId,
        amount_cents: split.amountCents,
        paid: false
      }))

      await supabase.from('rental_payments').insert(rentalPayments)
    }

    return result
  } catch (err) {
    console.error('Unexpected error ensuring pinned cottage rental:', err)
    return { expense: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Rebalances cottage rental splits equally among current members
 * Also updates rental_payments to match new split amounts
 */
export async function rebalanceCottageRental(
  expenseId: string,
  memberIds: string[]
): Promise<{ expense: ExpenseWithSplits | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { expense: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Fetch expense
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (fetchError || !expense) {
      return { expense: null, error: 'Expense not found' }
    }

    if (!expense.is_cottage_rental) {
      return { expense: null, error: 'Can only rebalance cottage rental expenses' }
    }

    // Calculate equal splits
    const totalAmount = expense.amount_cents
    const numMembers = memberIds.length
    const baseAmount = Math.floor(totalAmount / numMembers)
    const remainder = totalAmount % numMembers

    const splits = memberIds.map((userId, index) => ({
      userId,
      // First 'remainder' members get 1 extra cent to distribute remainder
      amountCents: baseAmount + (index < remainder ? 1 : 0)
    }))

    // Update splits
    const result = await updateExpenseWithSplits(expenseId, { splits })

    // Update rental_payments to match new split amounts
    if (result.expense) {
      // Get existing rental payments to preserve paid status
      const { data: existingPayments } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('room_id', expense.room_id)

      const paymentMap = new Map(existingPayments?.map(p => [p.user_id, p]) || [])

      // Upsert rental payments with new amounts
      const rentalPayments = splits.map(split => ({
        room_id: expense.room_id,
        user_id: split.userId,
        amount_cents: split.amountCents,
        paid: paymentMap.get(split.userId)?.paid || false,
        paid_at: paymentMap.get(split.userId)?.paid_at || null
      }))

      await supabase.from('rental_payments').upsert(rentalPayments, {
        onConflict: 'room_id,user_id'
      })
    }

    return result
  } catch (err) {
    console.error('Unexpected error rebalancing cottage rental:', err)
    return { expense: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Gets public URL for a receipt
 */
export function getReceiptPublicUrl(receiptPath: string): string | null {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return null
    }

    const { data } = supabase.storage
      .from('cottage_images')
      .getPublicUrl(receiptPath)

    return data.publicUrl
  } catch (err) {
    console.error('Unexpected error getting public URL:', err)
    return null
  }
}

/**
 * Lists rental payments for a room
 */
export async function listRentalPayments(roomId: string): Promise<{ payments: RentalPayment[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { payments: [], error: SUPABASE_ERROR_MESSAGE }
    }

    const { data, error } = await supabase
      .from('rental_payments')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching rental payments:', error)
      return { payments: [], error: error.message }
    }

    return { payments: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching rental payments:', err)
    return { payments: [], error: 'Unexpected error occurred' }
  }
}

/**
 * Toggles rental payment status and syncs expense_split atomically
 * Calls the toggle_rental_payment RPC function
 */
export async function toggleRentalPayment(
  paymentId: string,
  paid: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, error: SUPABASE_ERROR_MESSAGE }
    }

    const { error } = await supabase.rpc('toggle_rental_payment', {
      p_payment_id: paymentId,
      p_paid: paid
    })

    if (error) {
      console.error('Error toggling rental payment:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error toggling rental payment:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Backfills rental_payments from existing pinned cottage rental expense splits
 * Used when a pinned rental exists but rental_payments table is empty
 */
export async function backfillRentalPaymentsFromPinnedExpense(roomId: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { ok: false, error: SUPABASE_ERROR_MESSAGE }
    }

    // 1. Find pinned rental expense id for this room
    const { data: pinnedRental, error: rentalError } = await supabase
      .from('expenses')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_cottage_rental', true)
      .eq('pinned', true)
      .single()

    if (rentalError || !pinnedRental) {
      return { ok: false, error: 'No pinned cottage rental found' }
    }

    // 2. Get all expense_splits for this expense
    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .select('user_id, amount_cents')
      .eq('expense_id', pinnedRental.id)

    if (splitsError || !splits || splits.length === 0) {
      return { ok: false, error: 'No expense splits found' }
    }

    // 3. Upsert rental_payments from splits
    const rentalPayments = splits.map(split => ({
      room_id: roomId,
      user_id: split.user_id,
      amount_cents: split.amount_cents,
      paid: false,
      paid_at: null
    }))

    const { error: upsertError } = await supabase
      .from('rental_payments')
      .upsert(rentalPayments, {
        onConflict: 'room_id,user_id'
      })

    if (upsertError) {
      console.error('Error upserting rental payments:', upsertError)
      return { ok: false, error: upsertError.message }
    }

    return { ok: true, error: null }
  } catch (err) {
    console.error('Unexpected error backfilling rental payments:', err)
    return { ok: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Backfill cottage rental expense with correct price in cents
 * Fixes the bug where cottage.total_price (in dollars) was copied without conversion
 * This function:
 * 1. Reads selected cottage total_price (dollars)
 * 2. Converts to cents: totalPriceCents = total_price * 100
 * 3. Gets current split member IDs from expense_splits
 * 4. Recomputes splits in cents (equal distribution with fair remainder)
 * 5. Calls updateExpenseWithSplits RPC to atomically update expense and splits
 * 6. Updates rental_payments.amount_cents to the fair share (preserving paid status)
 */
export async function backfillCottagePriceConversion(roomId: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { ok: false, error: SUPABASE_ERROR_MESSAGE }
    }

    // 1. Get selected cottage's total_price
    const { data: selection, error: selectionError } = await supabase
      .from('room_selections')
      .select('cottage_id')
      .eq('room_id', roomId)
      .single()

    if (selectionError || !selection) {
      return { ok: false, error: 'No cottage selected for this room' }
    }

    const { data: cottage, error: cottageError } = await supabase
      .from('cottages')
      .select('total_price')
      .eq('id', selection.cottage_id)
      .single()

    if (cottageError || !cottage) {
      return { ok: false, error: 'Cottage not found' }
    }

    // 2. Convert from dollars to cents
    const totalPriceCents = Math.round((cottage.total_price ?? 0) * 100)

    // 3. Get the pinned rental expense ID
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_cottage_rental', true)
      .eq('pinned', true)
      .single()

    if (expenseError || !expense) {
      return { ok: false, error: 'No pinned cottage rental expense found' }
    }

    // 4. Get current split member IDs from expense_splits
    const { data: currentSplits, error: splitsError } = await supabase
      .from('expense_splits')
      .select('user_id')
      .eq('expense_id', expense.id)

    if (splitsError) {
      return { ok: false, error: `Error fetching expense splits: ${splitsError.message}` }
    }

    const memberIds = currentSplits?.map(s => s.user_id) || []

    if (memberIds.length === 0) {
      return { ok: false, error: 'No expense splits found for this cottage rental' }
    }

    // 5. Calculate equal splits with fair remainder distribution in cents
    // For 2342.00 (234200 cents) with 3 people:
    // base = floor(234200 / 3) = 78066
    // remainder = 234200 % 3 = 2
    // So 2 people get 78067 cents, 1 person gets 78066 cents
    const baseAmount = Math.floor(totalPriceCents / memberIds.length)
    const remainder = totalPriceCents % memberIds.length

    const recalculatedSplits = memberIds.map((userId, index) => ({
      userId,
      amountCents: baseAmount + (index < remainder ? 1 : 0)
    }))

    // 6. Call updateExpenseWithSplits to atomically update expense and splits via RPC
    const { expense: updatedExpense, error: updateError } = await updateExpenseWithSplits(expense.id, {
      amountCents: totalPriceCents,
      splits: recalculatedSplits
    })

    if (updateError) {
      return { ok: false, error: `Error updating expense: ${updateError}` }
    }

    if (!updatedExpense) {
      return { ok: false, error: 'Failed to update expense' }
    }

    // 7. Update rental_payments with new amounts (preserving paid status)
    const { data: existingPayments, error: paymentsError } = await supabase
      .from('rental_payments')
      .select('*')
      .eq('room_id', roomId)

    if (paymentsError) {
      return { ok: false, error: `Error fetching rental payments: ${paymentsError.message}` }
    }

    const paymentMap = new Map(existingPayments?.map(p => [p.user_id, p]) || [])

    const rentalPayments = recalculatedSplits.map(split => {
      const payment = paymentMap.get(split.userId)
      return {
        room_id: roomId,
        user_id: split.userId,
        amount_cents: split.amountCents, // Always update to new fair share
        paid: payment?.paid || false,
        paid_at: payment?.paid_at || null
      }
    })

    const { error: paymentsUpsertError } = await supabase
      .from('rental_payments')
      .upsert(rentalPayments, {
        onConflict: 'room_id,user_id'
      })

    if (paymentsUpsertError) {
      return { ok: false, error: `Error updating rental payments: ${paymentsUpsertError.message}` }
    }

    return { ok: true, error: null }
  } catch (err) {
    console.error('Unexpected error backfilling cottage price conversion:', err)
    return { ok: false, error: 'Unexpected error occurred' }
  }
}

// Payment Reminders

export type PaymentReminder = {
  id: string
  room_id: string
  from_user_id: string
  to_user_id: string
  reminder_type: string
  last_sent_at: string
  created_at: string
}

export type SendReminderResult = {
  success: boolean
  error?: string
  message?: string
  last_sent_at?: string
  next_allowed_at?: string
}

/**
 * Fetches existing payment reminders for the current user in a room
 */
export async function getPaymentReminders(roomId: string): Promise<{ reminders: PaymentReminder[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { reminders: [], error: SUPABASE_ERROR_MESSAGE }
    }

    const { data, error } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('room_id', roomId)

    if (error) {
      console.error('Error fetching payment reminders:', error)
      return { reminders: [], error: error.message }
    }

    return { reminders: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching payment reminders:', err)
    return { reminders: [], error: 'Unexpected error occurred' }
  }
}

/**
 * Sends a payment reminder to a user via Edge Function
 */
export async function sendPaymentReminder(
  roomId: string,
  fromUserId: string,
  toUserId: string,
  amountCents: number
): Promise<SendReminderResult> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, error: SUPABASE_ERROR_MESSAGE }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await supabase.functions.invoke('notify_payment_reminder', {
      body: {
        room_id: roomId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount_cents: amountCents
      }
    })

    if (response.error) {
      console.error('Error calling notify_payment_reminder:', response.error)
      return { success: false, error: response.error.message }
    }

    const result = response.data as SendReminderResult
    return result
  } catch (err) {
    console.error('Unexpected error sending payment reminder:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Calculate next allowed reminder time (5 days from last sent)
 */
export function getNextAllowedReminderTime(lastSentAt: string): Date {
  const lastSent = new Date(lastSentAt)
  return new Date(lastSent.getTime() + 5 * 24 * 60 * 60 * 1000)
}

/**
 * Check if a reminder can be sent (cooldown expired)
 */
export function canSendReminder(lastSentAt: string | undefined): boolean {
  if (!lastSentAt) return true
  const nextAllowed = getNextAllowedReminderTime(lastSentAt)
  return new Date() >= nextAllowed
}
