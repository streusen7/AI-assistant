"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Task {
  id: number;
  task_name: string;
  completed: boolean;
  timestamp: string;
  reminder?: string; // ISO string of reminder time
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    // Load tasks from localStorage
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }

    // Request notification permission on initial load
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, [router]);

  // Check for due reminders periodically
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminder && !task.completed) {
          const reminderTime = new Date(task.reminder);
          if (reminderTime <= now) {
            // Show notification
            if (Notification.permission === 'granted') {
              new Notification(`Reminder: ${task.task_name}`, {
                body: `This task is due now!`,
                icon: '/notification-icon.png'
              });
            }
            // Remove the reminder after triggering
            const updatedTasks = tasks.map(t => 
              t.id === task.id ? { ...t, reminder: undefined } : t
            );
            saveTasksToLocalStorage(updatedTasks);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  const saveTasksToLocalStorage = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const handleAddTask = () => {
    if (!taskName.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setAddLoading(true);
    try {
      const newTask: Task = {
        id: Date.now(), // Use timestamp as ID
        task_name: taskName,
        completed: false,
        timestamp: new Date().toISOString(),
      };

      const updatedTasks = [...tasks, newTask];
      saveTasksToLocalStorage(updatedTasks);
      setTaskName("");
    } catch (err) {
      setError("Failed to add task");
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleTask = (taskId: number, currentStatus: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setToggleLoadingId(taskId);
    try {
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, completed: !currentStatus } : task
      );
      saveTasksToLocalStorage(updatedTasks);
    } catch (err) {
      setError("Failed to update task");
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleEditTask = (taskId: number, currentName: string) => {
    const newName = prompt("Edit task name", currentName);
    if (!newName || newName.trim() === currentName) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setEditLoadingId(taskId);
    try {
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, task_name: newName } : task
      );
      saveTasksToLocalStorage(updatedTasks);
    } catch (err) {
      setError("Failed to edit task");
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleSetReminder = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentReminder = task.reminder ? new Date(task.reminder) : null;
    const defaultDateTime = currentReminder || new Date(Date.now() + 3600000); // Default to 1 hour from now

    const dateTimeString = prompt(
      'Set reminder date/time (YYYY-MM-DD HH:MM):',
      defaultDateTime.toISOString().slice(0, 16).replace('T', ' ')
    );

    if (!dateTimeString) return;

    try {
      const reminderDate = new Date(dateTimeString.replace(' ', 'T') + ':00');
      if (isNaN(reminderDate.getTime())) throw new Error('Invalid date');

      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, reminder: reminderDate.toISOString() } : t
      );
      saveTasksToLocalStorage(updatedTasks);
    } catch (err) {
      setError('Invalid date/time format. Please use YYYY-MM-DD HH:MM');
    }
  };

  const handleDeleteTask = (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setDeleteLoadingId(taskId);
    try {
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      saveTasksToLocalStorage(updatedTasks);
    } catch (err) {
      setError("Failed to delete task");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white"
    >
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-3xl font-bold mb-6">Your Tasks</h1>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-3 bg-red-500/10 text-red-500 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-3 mb-6"
          >
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Enter new task..."
              className="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading || addLoading}
            />
            <button
              onClick={handleAddTask}
              disabled={isLoading || addLoading || !taskName.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addLoading ? (
                <>
                  <span className="animate-spin">↻</span>
                  Adding...
                </>
              ) : "Add Task"}
            </button>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <motion.ul className="space-y-3">
              {tasks.length === 0 ? (
                <motion.li
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 text-center text-gray-400"
                >
                  No tasks yet. Add your first task above!
                </motion.li>
              ) : (
                tasks.map((task) => (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task.id, task.completed)}
                          disabled={toggleLoadingId === task.id}
                          className={`flex-shrink-0 h-5 w-5 rounded border ${task.completed ? 'border-green-500 bg-green-500' : 'border-gray-300'} flex items-center justify-center`}
                        >
                          {toggleLoadingId === task.id ? (
                            <span className="animate-spin text-xs">↻</span>
                          ) : task.completed ? (
                            <span className="text-white text-xs">✓</span>
                          ) : null}
                        </button>
                        
                        <div className="min-w-0">
                          <p className={`truncate ${task.completed ? "line-through text-gray-400" : ""}`}>
                            {task.task_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(task.timestamp)}
                            {task.reminder && (
                              <span className="text-blue-400 ml-2">
                                ⏰ {formatDate(task.reminder)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetReminder(task.id)}
                          className="p-2 text-blue-400 hover:text-blue-300"
                          title="Set Reminder"
                        >
                          ⏰
                        </button>
                        <button
                          onClick={() => handleEditTask(task.id, task.task_name)}
                          disabled={editLoadingId === task.id}
                          className="p-2 text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                          title="Edit"
                        >
                          {editLoadingId === task.id ? (
                            <span className="animate-spin">↻</span>
                          ) : "✏️"}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={deleteLoadingId === task.id}
                          className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                          title="Delete"
                        >
                          {deleteLoadingId === task.id ? (
                            <span className="animate-spin">↻</span>
                          ) : "🗑️"}
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))
              )}
            </motion.ul>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}