import React from 'react';
import { createRoot } from 'react-dom/client';
import TaskManager from './TaskManager';
import Vapi from '@vapi-ai/web';

require('dotenv').config();
const VAPI_API_KEY = process.env.VAPI_API_KEY;

// Initialize VAPI
const vapi = new Vapi(VAPI_API_KEY);

// Variable to keep track of call state
let callActive = false;
let pushToTalkActive = false;
let isAutomaticMode = true;

// Render the React app
const root = createRoot(document.getElementById('root'));
root.render(<TaskManager />);

// Create a custom event dispatcher for UI updates
function dispatchUIUpdate(type, data) {
  window.dispatchEvent(new CustomEvent(type, { detail: data }));
}

// Assistant configuration
const assistantConfig = {
  name: 'ADHD Task Assistant',
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
  },
  voice: {
    provider: 'playht',
    voiceId: 'jennifer',
  },
  model: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: `You are a friendly, understanding ADHD task assistant that helps users break down tasks into manageable steps. Speak in a casual, supportive tone and avoid being overly formal or robotic.

When a user mentions a task:
1. First, acknowledge their request in a friendly way and ask only the most relevant question based on the task type. For example:
   - For cleaning tasks: "That's a good one to tackle! How's your energy level right now - feeling up for this?"
   - For work tasks: "I can help you with that! When do you need to have this done by?"
   - For creative tasks: "Fun project! How much time can you set aside for this?"

2. Based on their response, only ask additional questions if truly needed for task breakdown. For example:
   - If they mention low energy, ask about breaking it into smaller chunks
   - If they mention a tight deadline, ask about priority items
   - If they're unsure about duration, help estimate based on similar tasks

3. When ready to create the breakdown:
   - Use the add_task function immediately to create the breakdown (this will instantly display in the user's interface)
   - Then say "I've created a task breakdown you can see below. Let me know if you'd like any changes!"
   - Do not list out the steps verbally - users can see them on screen
   - Be ready to modify the visible breakdown based on their feedback

Remember:
- The add_task function instantly displays tasks in the user's interface
- Call add_task as soon as you have a good breakdown in mind
- Keep responses brief since users can see the breakdown
- Speak like a supportive coach, not a task list
- If changes are needed, use update_task or delete_task to modify the visible list
- Acknowledge when tasks might be challenging
- Celebrate their initiative in breaking down the task

For task modifications:
- Use update_task for changes
- Use delete_task for deletions
- Use complete_task for marking items done
- Keep modification discussions focused on the visible task list

For motivation:
- Emphasize that each small step is progress
- Acknowledge that starting can be the hardest part
- Remind them they can take breaks between steps
- Be understanding if they need to modify the plan
- Celebrate when they complete steps`,


    functions: [
      {
        name: 'add_task',
        description: 'Adds a new task with subtasks to the task list',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the task' },
            priority: { type: 'integer', description: 'Priority of the task (1-5, where 1 is highest)' },
            duration: { type: 'integer', description: 'Estimated duration in minutes' },
            deadline: { type: 'string', description: 'Optional deadline for the task' },
            energy_level: { type: 'string', description: 'User\'s energy level (low/medium/high)' },
            subtasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Title of the subtask' },
                  priority: { type: 'integer', description: 'Priority of the subtask' },
                  duration: { type: 'integer', description: 'Estimated duration in minutes' },
                  stepNumber: { type: 'integer', description: 'Step number of the subtask' },
                  completed: { type: 'boolean', description: 'Completion status of the subtask' },
                  break_after: { type: 'boolean', description: 'Whether to take a break after this subtask' },
                },
                required: ['title', 'priority', 'duration', 'stepNumber'],
              },
            },
          },
          required: ['title', 'priority', 'duration', 'subtasks'],
        },
      },
      {
        name: 'update_task',
        description: 'Updates an existing task or subtask',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: { type: 'string', description: 'Title of the task to update' },
            subtaskTitle: { type: 'string', description: 'Title of the subtask to update (if applicable)' },
            updates: {
              type: 'object',
              properties: {
                newTitle: { type: 'string', description: 'New title for the task/subtask' },
                priority: { type: 'integer', description: 'New priority (1-5)' },
                duration: { type: 'integer', description: 'New duration in minutes' },
                deadline: { type: 'string', description: 'New deadline' },
                energy_level: { type: 'string', description: 'Updated energy level' },
                break_after: { type: 'boolean', description: 'Whether to take a break after this subtask' },
              },
            },
          },
          required: ['taskTitle', 'updates'],
        },
      },
      {
        name: 'delete_task',
        description: 'Deletes a task or subtask',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: { type: 'string', description: 'Title of the task to delete' },
            subtaskTitle: { type: 'string', description: 'Title of the subtask to delete (if applicable)' },
          },
          required: ['taskTitle'],
        },
      },
      {
        name: 'complete_task',
        description: 'Marks a task or subtask as completed',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: { type: 'string', description: 'Title of the task' },
            subtaskTitle: { type: 'string', description: 'Title of the subtask (if applicable)' },
          },
          required: ['taskTitle'],
        },
      },
    ],
  },
};

// Task management functions
let tasks = [];

function addTask(task) {
  // Add default properties if not present
  task.completed = task.completed || false;
  task.energy_level = task.energy_level || 'medium';
  task.deadline = task.deadline || null;

  if (task.subtasks && task.subtasks.length > 0) {
    task.subtasks = task.subtasks.map(subtask => ({
      ...subtask,
      completed: subtask.completed || false,
      break_after: subtask.break_after || false
    }));
  }

  tasks.push(task);
  dispatchUIUpdate('tasksUpdated', tasks);
}

function updateTask(taskTitle, subtaskTitle, updates) {
  const taskIndex = tasks.findIndex((t) => t.title === taskTitle);
  if (taskIndex === -1) {
    console.error('Task not found:', taskTitle);
    return;
  }

  const updatedTasks = [...tasks];
  if (subtaskTitle) {
    const subtaskIndex = updatedTasks[taskIndex].subtasks.findIndex(
      (st) => st.title === subtaskTitle
    );
    if (subtaskIndex === -1) {
      console.error('Subtask not found:', subtaskTitle);
      return;
    }
    updatedTasks[taskIndex].subtasks[subtaskIndex] = {
      ...updatedTasks[taskIndex].subtasks[subtaskIndex],
      ...updates,
      title: updates.newTitle || updatedTasks[taskIndex].subtasks[subtaskIndex].title
    };
  } else {
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      ...updates,
      title: updates.newTitle || updatedTasks[taskIndex].title
    };
  }
  
  tasks = updatedTasks;
  dispatchUIUpdate('tasksUpdated', tasks);
}

function deleteTask(taskTitle, subtaskTitle) {
  if (subtaskTitle) {
    const taskIndex = tasks.findIndex((t) => t.title === taskTitle);
    if (taskIndex !== -1) {
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex].subtasks = updatedTasks[taskIndex].subtasks.filter(
        (st) => st.title !== subtaskTitle
      );
      tasks = updatedTasks;
      dispatchUIUpdate('tasksUpdated', tasks);
    }
  } else {
    tasks = tasks.filter((t) => t.title !== taskTitle);
    dispatchUIUpdate('tasksUpdated', tasks);
  }
}

function completeTask(taskTitle, subtaskTitle) {
  const taskIndex = tasks.findIndex((t) => t.title === taskTitle);
  if (taskIndex === -1) {
    console.error('Task not found:', taskTitle);
    return;
  }

  const updatedTasks = [...tasks];
  if (subtaskTitle) {
    const subtask = updatedTasks[taskIndex].subtasks?.find(
      (st) => st.title === subtaskTitle
    );
    if (subtask) {
      subtask.completed = true;
      updatedTasks[taskIndex].completed = updatedTasks[taskIndex].subtasks.every(
        (st) => st.completed
      );
    }
  } else {
    updatedTasks[taskIndex].completed = true;
    if (updatedTasks[taskIndex].subtasks) {
      updatedTasks[taskIndex].subtasks.forEach((st) => {
        st.completed = true;
      });
    }
  }

  tasks = updatedTasks;
  // Ensure UI update is triggered
  dispatchUIUpdate('tasksUpdated', [...tasks]);
}

// Event handlers for VAPI
vapi.on('call-start', () => {
  console.log('Call has started.');
  callActive = true;
  dispatchUIUpdate('callStateChanged', { isActive: true });
  
  if (pushToTalkActive) {
    setTimeout(() => {
      vapi.setMuted(false);
    }, 500);
  }
});

vapi.on('call-end', () => {
  console.log('Call has ended.');
  callActive = false;
  dispatchUIUpdate('callStateChanged', { isActive: false });
});

vapi.on('speech-start', () => {
  console.log('Assistant has started speaking.');
  dispatchUIUpdate('speechStateChanged', { isSpeaking: true });
});

vapi.on('speech-end', () => {
  console.log('Assistant has finished speaking.');
  dispatchUIUpdate('speechStateChanged', { isSpeaking: false });
});

vapi.on('message', (message) => {
  console.log('Received message:', message);

  if (message.functionCall) {
    handleFunctionCall(message.functionCall);
  } else if (message.type === 'transcript') {
    dispatchUIUpdate('transcriptUpdated', {
      text: message.transcript,
      isFinal: message.transcriptType === 'final'
    });
  }
});

function handleFunctionCall(functionCall) {
  console.log('handleFunctionCall called with:', functionCall);

  const functionName = functionCall.name;
  const args = functionCall.parameters;

  try {
    switch (functionName) {
      case 'add_task':
        addTask(args);
        break;
      case 'update_task':
        updateTask(args.taskTitle, args.subtaskTitle, args.updates);
        break;
      case 'delete_task':
        deleteTask(args.taskTitle, args.subtaskTitle);
        break;
      case 'complete_task':
        completeTask(args.taskTitle, args.subtaskTitle);
        break;
      default:
        console.warn('Unknown function call:', functionName);
        return;
    }

    vapi.send({
      type: 'add-message',
      message: {
        role: 'function',
        name: functionName,
        content: JSON.stringify({ result: `${functionName} executed successfully` }),
      },
    });
  } catch (error) {
    console.error(`Error processing ${functionName}:`, error);
    vapi.send({
      type: 'add-message',
      message: {
        role: 'function',
        name: functionName,
        content: JSON.stringify({ error: error.message }),
      },
    });
  }
}

// Voice interaction functions
function startVoiceInteraction() {
  if (isAutomaticMode) {
    vapi.start(assistantConfig);  // Remove assistantOverrides
    dispatchUIUpdate('callStateChanged', { isActive: true });
  } else {
    pushToTalkActive = true;
    vapi.start(assistantConfig);  // Remove assistantOverrides
    vapi.setMuted(true);
  }
}

function stopVoiceInteraction() {
  vapi.stop();
  dispatchUIUpdate('callStateChanged', { isActive: false });
  if (!isAutomaticMode) {
    pushToTalkActive = false;
  }
}

async function handlePushToTalkStart() {
  try {
    if (!callActive) {
      pushToTalkActive = true;
      await vapi.start(assistantConfig);  // Remove assistantOverrides
      setTimeout(() => {
        vapi.setMuted(false);
      }, 500);
    } else {
      vapi.setMuted(false);
    }
  } catch (error) {
    console.error('Error starting push-to-talk:', error);
  }
}

function handlePushToTalkEnd() {
  try {
    if (callActive) {
      vapi.setMuted(true);
      pushToTalkActive = false;
    }
  } catch (error) {
    console.error('Error ending push-to-talk:', error);
  }
}

function setVoiceMode(mode) {
  isAutomaticMode = mode === 'automatic';
  dispatchUIUpdate('voiceModeChanged', { mode });
}

// Export everything needed by the React component
export {
  vapi,
  startVoiceInteraction,
  stopVoiceInteraction,
  handlePushToTalkStart,
  handlePushToTalkEnd,
  setVoiceMode,
  tasks,
  updateTask,
  deleteTask
};