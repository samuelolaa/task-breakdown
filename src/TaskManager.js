import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Plus, 
  MoreVertical, 
  Check, 
  Edit2, 
  Trash2, 
  Clock, 
  Calendar,
  Battery, 
  X,
  XCircle
} from 'lucide-react';
import { 
  startVoiceInteraction, 
  stopVoiceInteraction,
  handlePushToTalkStart,
  handlePushToTalkEnd,
  setVoiceMode as setVapiVoiceMode,
  updateTask,
  deleteTask
} from './app.js';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [voiceMode, setVoiceMode] = useState('automatic');
  const [isHolding, setIsHolding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    priority: 1,
    duration: 0,
    deadline: '',
    energy_level: 'medium'
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  useEffect(() => {
    const handleTasksUpdate = (event) => {
      console.log('Task update received:', event.detail);
      setTasks([...event.detail]);
    };

    const handleCallStateChange = (event) => {
      setIsCallActive(event.detail.isActive);
    };

    const handleVoiceModeChange = (event) => {
      setVoiceMode(event.detail.mode);
    };

    window.addEventListener('tasksUpdated', handleTasksUpdate);
    window.addEventListener('callStateChanged', handleCallStateChange);
    window.addEventListener('voiceModeChanged', handleVoiceModeChange);

    return () => {
      window.removeEventListener('tasksUpdated', handleTasksUpdate);
      window.removeEventListener('callStateChanged', handleCallStateChange);
      window.removeEventListener('voiceModeChanged', handleVoiceModeChange);
    };
  }, []);

  const handleTaskCheckbox = (taskIndex) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].completed = !newTasks[taskIndex].completed;
    
    if (newTasks[taskIndex].subtasks) {
      newTasks[taskIndex].subtasks.forEach(subtask => {
        subtask.completed = newTasks[taskIndex].completed;
      });
    }
    setTasks(newTasks);
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: newTasks }));
  };

  const handleSubtaskCheckbox = (taskIndex, subtaskIndex) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].subtasks[subtaskIndex].completed = 
      !newTasks[taskIndex].subtasks[subtaskIndex].completed;
    
    newTasks[taskIndex].completed = 
      newTasks[taskIndex].subtasks.every(subtask => subtask.completed);
    setTasks(newTasks);
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: newTasks }));
  };

  const handleVoiceButtonClick = () => {
    if (isCallActive) {
      stopVoiceInteraction();
    } else {
      startVoiceInteraction();
    }
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setVoiceMode(newMode);
    setVapiVoiceMode(newMode);
  };

  const handlePushToTalk = (isPressed) => {
    if (isPressed) {
      setIsHolding(true);
      handlePushToTalkStart();
    } else {
      setIsHolding(false);
      handlePushToTalkEnd();
    }
  };

  const handleEditClick = (task, subtask = null) => {
    setEditingTask(task);
    setEditingSubtask(subtask);
    setEditForm({
      title: subtask ? subtask.title : task.title,
      priority: subtask ? subtask.priority : task.priority,
      duration: subtask ? subtask.duration : task.duration,
      deadline: task.deadline || '',
      energy_level: task.energy_level || 'medium'
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updates = {
      newTitle: editForm.title,
      priority: parseInt(editForm.priority),
      duration: parseInt(editForm.duration),
      deadline: editForm.deadline || null,
      energy_level: editForm.energy_level
    };

    updateTask(
      editingTask.title,
      editingSubtask?.title,
      updates
    );

    setShowEditModal(false);
    setEditingTask(null);
    setEditingSubtask(null);
  };

  const handleDeleteClick = (task, subtask = null) => {
    if (window.confirm(`Are you sure you want to delete this ${subtask ? 'subtask' : 'task'}?`)) {
      deleteTask(task.title, subtask?.title);
    }
  };

  const getEnergyLevelIcon = (level) => {
    switch (level) {
      case 'low':
        return <Battery className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Battery className="w-4 h-4 text-yellow-500" />;
      case 'high':
        return <Battery className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1: return 'text-red-600';
      case 2: return 'text-orange-500';
      case 3: return 'text-yellow-500';
      case 4: return 'text-blue-500';
      case 5: return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between bg-white shadow-md p-4">
        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700 focus:outline-none">
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-medium">Tasks</h2>
        <div></div> {/* Placeholder for alignment */}
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
          
          {/* Sidebar */}
          <div className="relative w-64 bg-white shadow-lg p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5 text-gray-500" />
                <h2 className="text-xl font-medium">Tasks</h2>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-700 focus:outline-none">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="space-y-2 flex-1">
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Check className="w-4 h-4" />
                </span>
                <span className="text-gray-700">All Tasks</span>
                <span className="ml-auto text-gray-400">{tasks.length}</span>
              </button>
            </nav>

            <button className="mt-6 w-full flex items-center gap-2 p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
              <Plus className="w-4 h-4" />
              <span>Add New List</span>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white shadow-lg p-6 flex-col">
        <div className="flex items-center gap-2 mb-8">
          <Menu className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-medium">Tasks</h2>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left">
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-gray-700">All Tasks</span>
            <span className="ml-auto text-gray-400">{tasks.length}</span>
          </button>
        </nav>

        <button className="mt-6 w-full flex items-center gap-2 p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
          <Plus className="w-4 h-4" />
          <span>Add New List</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Today's Tasks</h1>
          <p className="text-gray-500">
            {new Date().toLocaleDateString('en-GB', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </header>

        {/* Voice Control Panel */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4 flex-col md:flex-row">
            <h3 className="text-lg font-medium">Voice Control</h3>
            <select 
              className="mt-4 md:mt-0 rounded-lg border border-gray-200 px-4 py-2 text-sm"
              value={voiceMode}
              onChange={handleModeChange}
            >
              <option value="automatic">Automatic Detection</option>
              <option value="push-to-talk">Push-to-Talk</option>
            </select>
          </div>

          {voiceMode === 'automatic' ? (
            <button 
              onClick={handleVoiceButtonClick}
              className={`w-full mt-4 md:mt-0 ${isCallActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg py-3 transition-colors`}
            >
              {isCallActive ? 'Stop Voice Interaction' : 'Start Voice Interaction'}
            </button>
          ) : (
            <div className="space-y-2 mt-4 md:mt-0">
              <button 
                onMouseDown={() => handlePushToTalk(true)}
                onMouseUp={() => handlePushToTalk(false)}
                onMouseLeave={() => isHolding && handlePushToTalk(false)}
                className={`w-full rounded-lg py-3 transition-all duration-150 relative ${
                  isHolding 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium`}
              >
                {isHolding && (
                  <div className="absolute left-0 top-0 h-full bg-red-600 transition-all duration-150 rounded-lg" 
                       style={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }}>
                    <style>
                      {`
                        @keyframes pulse {
                          0% { opacity: 0.8; }
                          50% { opacity: 0.6; }
                          100% { opacity: 0.8; }
                        }
                      `}
                    </style>
                  </div>
                )}
                <span className="relative z-10">{isHolding ? 'Recording...' : 'Hold to Speak'}</span>
              </button>
              <p className="text-gray-500 text-sm text-center">
                {isHolding ? 'Recording in progress... Release when done.' : 'Press and hold to start speaking'}
              </p>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map((task, taskIndex) => (
            <div key={taskIndex} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-col md:flex-row">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-full border-2 border-gray-300"
                    checked={task.completed}
                    onChange={() => handleTaskCheckbox(taskIndex)}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                        Priority {task.priority}
                      </span>
                    </div>
                    {task.energy_level && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        {getEnergyLevelIcon(task.energy_level)}
                        <span className="capitalize">{task.energy_level} Energy</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    {task.duration} min
                  </span>
                  {task.deadline && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditClick(task)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(task)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {task.subtasks && (
                <div className="ml-8 space-y-3">
                  {task.subtasks.map((subtask, subtaskIndex) => (
                    <div key={subtaskIndex} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-full border-2 border-gray-300"
                          checked={subtask.completed}
                          onChange={() => handleSubtaskCheckbox(taskIndex, subtaskIndex)}
                        />
                        <div className="flex items-center gap-2">
                          <span className={`text-gray-600 ${subtask.completed ? 'line-through text-gray-400' : ''}`}>
                            {subtask.title}
                          </span>
                          <span className={`text-sm ${getPriorityColor(subtask.priority)}`}>
                            (Priority {subtask.priority})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">
                          {subtask.duration} min
                        </span>
                        {subtask.break_after && (
                          <span className="text-blue-500 text-sm">
                            Break after
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditClick(task, subtask)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(task, subtask)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Edit {editingSubtask ? 'Subtask' : 'Task'}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-5)
                </label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                >
                  <option value="1">1 (Highest)</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5 (Lowest)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  min="1"
                  required
                />
              </div>

              {!editingSubtask && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline (optional)
                    </label>
                    <input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Energy Level
                    </label>
                    <select
                      value={editForm.energy_level}
                      onChange={(e) => setEditForm({ ...editForm, energy_level: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
