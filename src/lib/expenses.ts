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
 * Creates an expense with splits
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

    // Insert expense with optional pre-generated ID
    const expenseData: any = {
      room_id: payload.roomId,
      title: payload.title,
      amount_cents: payload.amountCents,
      currency: payload.currency,
      paid_by_user_id: payload.paidByUserId,
      created_by_user_id: user.id,
      receipt_path: payload.receiptPath,
      is_cottage_rental: payload.isCottageRental,
      pinned: payload.pinned
    }

    if (payload.expenseId) {
      expenseData.id = payload.expenseId
    }

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError)
      return { expense: null, error: expenseError.message }
    }

    // Insert splits
    const splitsToInsert = payload.splits.map(split => ({
      expense_id: expense.id,
      user_id: split.userId,
      amount_cents: split.amountCents
    }))

    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splitsToInsert)
      .select()

    if (splitsError) {
      // Rollback expense if splits fail
      await supabase.from('expenses').delete().eq('id', expense.id)
      console.error('Error creating expense splits:', splitsError)
      return { expense: null, error: splitsError.message }
    }

    return {
      expense: {
        ...expense,
        splits: splits || []
      },
      error: null
    }
  } catch (err) {
    console.error('Unexpected error creating expense:', err)
    return { expense: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Updates an expense and replaces its splits
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

    // Fetch current expense to validate
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (fetchError || !currentExpense) {
      return { expense: null, error: 'Expense not found' }
    }

    // Build update object
    const updateData: any = {}
    if (payload.title !== undefined) updateData.title = payload.title
    if (payload.amountCents !== undefined) updateData.amount_cents = payload.amountCents
    if (payload.paidByUserId !== undefined) updateData.paid_by_user_id = payload.paidByUserId
    if (payload.receiptPath !== undefined) updateData.receipt_path = payload.receiptPath

    // Validate splits sum if provided
    if (payload.splits && payload.amountCents) {
      const splitsSum = payload.splits.reduce((sum, split) => sum + split.amountCents, 0)
      if (splitsSum !== payload.amountCents) {
        return { expense: null, error: 'Splits must sum to expense amount' }
      }
    }

    // Update expense
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId)

      if (updateError) {
        console.error('Error updating expense:', updateError)
        return { expense: null, error: updateError.message }
      }
    }

    // Replace splits if provided
    if (payload.splits) {
      // Delete old splits
      const { error: deleteError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId)

      if (deleteError) {
        console.error('Error deleting old splits:', deleteError)
        return { expense: null, error: deleteError.message }
      }

      // Insert new splits
      const splitsToInsert = payload.splits.map(split => ({
        expense_id: expenseId,
        user_id: split.userId,
        amount_cents: split.amountCents
      }))

      const { error: insertError } = await supabase
        .from('expense_splits')
        .insert(splitsToInsert)

      if (insertError) {
        console.error('Error inserting new splits:', insertError)
        return { expense: null, error: insertError.message }
      }
    }

    // Fetch updated expense with splits
    const { data: updatedExpense, error: refetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (refetchError) {
      return { expense: null, error: refetchError.message }
    }

    const { data: splits } = await supabase
      .from('expense_splits')
      .select('*')
      .eq('expense_id', expenseId)

    return {
      expense: {
        ...updatedExpense,
        splits: splits || []
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
 */
export async function ensurePinnedCottageRental(
  roomId: string,
  memberIds: string[],
  adminUserId: string
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

    // Create default pinned cottage rental with $0 and equal splits
    const amountPerPerson = 0 // Will be updated by admin later
    const splits = memberIds.map(userId => ({
      userId,
      amountCents: amountPerPerson
    }))

    return await createExpenseWithSplits({
      roomId,
      title: 'Cottage Rental',
      amountCents: 0,
      currency: 'CAD',
      paidByUserId: adminUserId,
      receiptPath: null, // Receipt is optional for cottage rental
      isCottageRental: true,
      pinned: true,
      splits
    })
  } catch (err) {
    console.error('Unexpected error ensuring pinned cottage rental:', err)
    return { expense: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Rebalances cottage rental splits equally among current members
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
    return await updateExpenseWithSplits(expenseId, { splits })
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
