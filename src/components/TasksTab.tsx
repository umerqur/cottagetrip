import { useState } from 'react'
import { Check, Clock, Pencil, Trash2 } from 'lucide-react'
import { RoomMember, RoomTask, getSupabase } from '../lib/supabase'
import { type Profile } from '../lib/profiles'
import {
  createRoomTask,
  updateRoomTask,
  deleteRoomTask,
  toggleTaskCompletion
} from '../lib/tasks'

interface TasksTabProps {
  roomId: string
  tasks: RoomTask[]
  setTasks: React.Dispatch<React.SetStateAction<RoomTask[]>>
  roomMembers: RoomMember[]
  memberProfiles: Profile[]
  isAdmin: boolean
  tasksLoading: boolean
  currentUserId: string | null
}

interface TaskFormProps {
  taskName: string
  assignee: string
  roomMembers: RoomMember[]
  memberProfiles: Profile[]
  disabled: boolean
  onTaskNameChange: (value: string) => void
  onAssigneeChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  showCancel?: boolean
}

function TaskForm({
  taskName,
  assignee,
  roomMembers,
  memberProfiles,
  disabled,
  onTaskNameChange,
  onAssigneeChange,
  onSubmit,
  onCancel,
  showCancel = false
}: TaskFormProps) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={taskName}
        onChange={(e) => onTaskNameChange(e.target.value)}
        placeholder="Task name"
        disabled={disabled}
        className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !showCancel) {
            e.preventDefault()
            onSubmit()
          }
        }}
        autoFocus={showCancel}
      />
      <select
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
        disabled={disabled}
        className="w-full sm:w-48 rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
      >
        <option value="">Unassigned</option>
        {roomMembers.map((member) => {
          const profile = memberProfiles.find((p) => p.id === member.user_id)
          return (
            <option key={member.user_id} value={member.user_id}>
              {profile?.display_name || 'Member'}
            </option>
          )
        })}
      </select>

      {showCancel ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onSubmit}
            disabled={!taskName.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2F241A] hover:bg-[#1F1812] rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-[#1F1812] shadow-sm"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-[#6B5C4D] hover:text-[#2F241A] bg-white hover:bg-[#FAFAF9] border border-[rgba(47,36,26,0.1)] rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function TasksTab({
  roomId,
  tasks,
  setTasks,
  roomMembers,
  memberProfiles,
  isAdmin,
  tasksLoading,
  currentUserId
}: TasksTabProps) {
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>('')
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null)

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return

    setIsAdding(true)
    const { task, error } = await createRoomTask(
      roomId,
      newTaskName.trim(),
      newTaskAssignee || null
    )

    if (!error && task) {
      setTasks([...tasks, task])
      setNewTaskName('')
      setNewTaskAssignee('')

      const supabase = getSupabase()
      if (supabase) {
        try {
          const { error } = await supabase.functions.invoke('notify_task_assigned', {
            body: { task_id: task.id }
          })
          if (error) console.error('notify_task_assigned failed', error)
        } catch (e) {
          console.error('notify_task_assigned crashed', e)
        }
      }
    } else if (error) {
      alert(`Failed to create task: ${error}`)
    }

    setIsAdding(false)
  }

  const handleUpdateTask = async (taskId: string) => {
    if (!editTaskName.trim()) return

    const previousTask = tasks.find((t) => t.id === taskId)
    const prevAssigneeId = previousTask?.assigned_to ?? null
    const nextAssigneeId = editTaskAssignee || null

    const { task, error } = await updateRoomTask(taskId, {
      task_name: editTaskName.trim(),
      assigned_to: nextAssigneeId
    })

    if (!error && task) {
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)))
      setEditingTaskId(null)

      const didAssigneeChange = prevAssigneeId !== nextAssigneeId
      const shouldNotify = didAssigneeChange && !!nextAssigneeId

      if (shouldNotify) {
        const supabase = getSupabase()
        if (supabase) {
          try {
            const { error } = await supabase.functions.invoke('notify_task_assigned', {
              body: { task_id: task.id }
            })
            if (error) console.error('notify_task_assigned failed', error)
          } catch (e) {
            console.error('notify_task_assigned crashed', e)
          }
        }
      }
    } else if (error) {
      alert(`Failed to update task: ${error}`)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    const { success, error } = await deleteRoomTask(taskId)

    if (success) {
      setTasks(tasks.filter((t) => t.id !== taskId))
    } else if (error) {
      alert(`Failed to delete task: ${error}`)
    }
  }

  const startEditing = (task: RoomTask) => {
    setEditingTaskId(task.id)
    setEditTaskName(task.task_name)
    setEditTaskAssignee(task.assigned_to || '')
  }

  const cancelEditing = () => {
    setEditingTaskId(null)
    setEditTaskName('')
    setEditTaskAssignee('')
  }

  const handleToggleCompletion = async (task: RoomTask) => {
    setTogglingTaskId(task.id)
    const { task: updatedTask, error } = await toggleTaskCompletion(task.id, !task.done)

    if (error) {
      alert(`Failed to toggle completion: ${error}`)
    } else if (updatedTask) {
      setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    }

    setTogglingTaskId(null)
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-6 rounded-xl border border-[rgba(47,36,26,0.1)] bg-white/70 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-bold text-[#2F241A] mb-4">Add Task</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Task name"
              disabled={isAdding}
              className="flex-1 rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddTask()
                }
              }}
            />
            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              disabled={isAdding}
              className="w-full sm:w-48 rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              {roomMembers.map((member) => {
                const profile = memberProfiles.find((p) => p.id === member.user_id)
                return (
                  <option key={member.user_id} value={member.user_id}>
                    {profile?.display_name || 'Member'}
                  </option>
                )
              })}
            </select>
            <button
              onClick={handleAddTask}
              disabled={!newTaskName.trim() || isAdding}
              className="rounded-lg bg-[#2F241A] px-6 py-2.5 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-[#1F1812] shadow-sm whitespace-nowrap text-sm"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[rgba(47,36,26,0.1)] bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
        {tasksLoading ? (
          <div className="px-6 py-8 sm:py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-[#2F241A] border-r-transparent"></div>
              <span className="text-[#6B5C4D]">Loading tasks...</span>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="px-6 py-8 sm:py-12 text-center text-[#6B5C4D]">
            {isAdmin ? 'No tasks yet. Add your first task above.' : 'No tasks assigned yet.'}
          </div>
        ) : (
          <div className="divide-y divide-[rgba(47,36,26,0.1)]">
            {tasks.map((task) => {
              const assigneeProfile = task.assigned_to
                ? memberProfiles.find((p) => p.id === task.assigned_to)
                : null

              const canToggle =
                !!currentUserId && (isAdmin || task.assigned_to === currentUserId)

              return (
                <div
                  key={task.id}
                  className={`p-3 sm:p-5 hover:bg-[#FAFAF9]/50 transition relative ${
                    task.done ? 'bg-green-50/30' : ''
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 h-full w-0.5 ${
                      task.done ? 'bg-green-400/60' : 'bg-transparent'
                    }`}
                  />

                  {editingTaskId === task.id ? (
                    <TaskForm
                      taskName={editTaskName}
                      assignee={editTaskAssignee}
                      roomMembers={roomMembers}
                      memberProfiles={memberProfiles}
                      disabled={false}
                      onTaskNameChange={setEditTaskName}
                      onAssigneeChange={setEditTaskAssignee}
                      onSubmit={() => handleUpdateTask(task.id)}
                      onCancel={cancelEditing}
                      showCancel={true}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-start">
                      <div className="min-w-0 space-y-2">
                        <h4 className="text-base font-bold text-[#2F241A] line-clamp-2">
                          {task.task_name}
                        </h4>

                        <div className="text-sm text-[#6B5C4D]">
                          {assigneeProfile ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/60 border border-[rgba(47,36,26,0.12)] backdrop-blur-sm text-[#6B5C4D] text-xs font-medium truncate max-w-[160px] sm:max-w-none">
                              {assigneeProfile.display_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/40 border border-[rgba(47,36,26,0.08)] text-[#6B5C4D] text-xs italic">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-3">
                        <div className="flex justify-end w-full">
                          {task.done ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium flex-shrink-0">
                              Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium flex-shrink-0">
                              Open
                            </span>
                          )}
                        </div>

                        {(canToggle || isAdmin) && (
                          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:gap-3 w-full">
                            {canToggle && (
                              <button
                                onClick={() => handleToggleCompletion(task)}
                                disabled={togglingTaskId === task.id}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-[#6B5C4D] hover:text-[#2F241A] bg-white hover:bg-[#FAFAF9] border border-[rgba(47,36,26,0.1)] hover:border-[#2F241A] rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {togglingTaskId === task.id ? (
                                  '...'
                                ) : task.done ? (
                                  <>
                                    <Clock className="h-4 w-4" />
                                    <span>Mark open</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4" />
                                    <span>Mark done</span>
                                  </>
                                )}
                              </button>
                            )}

                            {isAdmin && (
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                <button
                                  onClick={() => startEditing(task)}
                                  className="w-full sm:w-auto min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium text-[#6B5C4D] hover:text-[#2F241A] bg-white hover:bg-[#FAFAF9] border border-[rgba(47,36,26,0.1)] hover:border-[#2F241A] rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-1"
                                  aria-label="Edit task"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="hidden sm:inline">Edit</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="w-full sm:w-auto min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                  aria-label="Delete task"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
