import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const runningTasks = computed(() => tasks.value.filter(t => t.status === 'running'))
  function addTask(task) {
    tasks.value.push({ id: Date.now(), ...task, status: 'pending', createdAt: new Date() })
  }
  function updateTaskStatus(taskId, status, result = null) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = status
      task.result = result
      task.updatedAt = new Date()
    }
  }
  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(t => t.status !== 'completed' && t.status !== 'failed')
  }
  return { tasks, runningTasks, addTask, updateTaskStatus, clearCompletedTasks }
})
