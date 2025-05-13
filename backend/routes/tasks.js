const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/emailService');
require('dotenv').config();

const USER_EMAIL = process.env.USER_EMAIL;

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar tarefas', error });
  }
});

// POST a new task
router.post('/', async (req, res) => {
  const { text, dueDate } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }
  const id = uuidv4();
  const createdAt = new Date();
  try {
    await pool.query(
      'INSERT INTO tasks (id, text, completed, createdAt, dueDate) VALUES (?, ?, ?, ?, ?)',
      [id, text, false, createdAt, dueDate ? new Date(dueDate) : null]
    );
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    const newTask = rows[0];

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
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar tarefa', error });
  }
});

// PUT update a task (nome, data/hora e/ou completed)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { text, dueDate, completed } = req.body;
  try {
    // Atualiza apenas os campos enviados
    const [result] = await pool.query(
      'UPDATE tasks SET text = COALESCE(?, text), dueDate = COALESCE(?, dueDate), completed = COALESCE(?, completed) WHERE id = ?',
      [text, dueDate !== undefined ? dueDate : null, completed !== undefined ? completed : null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao editar tarefa', error });
  }
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const deletedTask = rows[0];
    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

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
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar tarefa', error });
  }
});

module.exports = { router };