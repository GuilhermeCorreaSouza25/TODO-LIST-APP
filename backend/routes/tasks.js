const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/emailService');
require('dotenv').config();

// Em memória para simplificar. Use um banco de dados em produção.
let tasks = [];
const USER_EMAIL = process.env.USER_EMAIL;

// GET all tasks
router.get('/', (req, res) => {
  res.json(tasks);
});

// POST a new task
router.post('/', async (req, res) => {
  const { text, dueDate } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }
  const newTask = {
    id: uuidv4(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
  };
  tasks.push(newTask);

  // Notificação por email - Adição de tarefa
  if (USER_EMAIL) {
    await sendEmail(
      USER_EMAIL,
      'Nova Tarefa Adicionada!',
      `Uma nova tarefa foi adicionada à sua lista: "${newTask.text}". Prazo: ${newTask.dueDate ? new Date(newTask.dueDate).toLocaleString() : 'N/A'}`,
      `<p>Uma nova tarefa foi adicionada à sua lista: <strong>"${newTask.text}"</strong>.</p><p>Prazo: ${newTask.dueDate ? new Date(newTask.dueDate).toLocaleString() : 'N/A'}</p>`
    );
  }

  res.status(201).json(newTask);
});

// PUT update a task (e.g., mark as completed)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { text, completed, dueDate } = req.body;
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const originalTask = tasks[taskIndex];
  tasks[taskIndex] = {
    ...originalTask,
    text: text !== undefined ? text : originalTask.text,
    completed: completed !== undefined ? completed : originalTask.completed,
    dueDate: dueDate !== undefined ? new Date(dueDate).toISOString() : originalTask.dueDate,
  };

  res.json(tasks[taskIndex]);
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];

  // Notificação por email - Remoção de tarefa
  if (USER_EMAIL) {
    await sendEmail(
      USER_EMAIL,
      'Tarefa Removida',
      `A tarefa "${deletedTask.text}" foi removida da sua lista.`,
      `<p>A tarefa "<strong>${deletedTask.text}</strong>" foi removida da sua lista.</p>`
    );
  }

  res.status(200).json({ message: 'Task deleted successfully', task: deletedTask });
});

// Função para ser usada pelo notificationService
const getTasks = () => tasks;

module.exports = { router, getTasks };