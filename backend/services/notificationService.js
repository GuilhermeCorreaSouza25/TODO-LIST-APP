const cron = require('node-cron');
const { sendEmail } = require('./emailService');
const { getTasks } = require('../routes/tasks'); // Importa a função getTasks
require('dotenv').config();

const USER_EMAIL = process.env.USER_EMAIL;

// Verifica tarefas próximas a cada minuto
const scheduleUpcomingTaskReminders = () => {
  cron.schedule('* * * * *', async () => { // Executa a cada minuto
    console.log('Verificando tarefas próximas...');
    const tasks = getTasks(); // Obtém a lista atual de tarefas
    const now = new Date();

    tasks.forEach(task => {
      if (!task.completed && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const timeDifference = dueDate.getTime() - now.getTime();
        const oneHour = 60 * 60 * 1000;

        // Se a tarefa vence em 1 hora ou menos e ainda não passou
        if (timeDifference > 0 && timeDifference <= oneHour) {
          // Adicionar uma flag para evitar múltiplas notificações para a mesma tarefa
          // (Simplificado aqui, idealmente, armazenar estado de notificação)
          if (!task.notifiedUpcoming) {
            console.log(`Tarefa próxima encontrada: ${task.text}`);
            if (USER_EMAIL) {
              sendEmail(
                USER_EMAIL,
                `Lembrete: Tarefa Próxima - "${task.text}"`,
                `A tarefa "${task.text}" está programada para ${new Date(task.dueDate).toLocaleString()}. Menos de uma hora restante!`,
                `<p>Lembrete!</p><p>A tarefa "<strong>${task.text}</strong>" está programada para <strong>${new Date(task.dueDate).toLocaleString()}</strong>.</p><p>Menos de uma hora restante!</p>`
              );
              task.notifiedUpcoming = true; // Marca como notificado para evitar repetição (em memória)
            }
          }
        } else if (timeDifference <= 0 && task.notifiedUpcoming) {
          // Resetar flag se o prazo passou para futuras edições
          task.notifiedUpcoming = false;
        }
      }
    });
  });
  console.log('Agendador de lembretes de tarefas próximas iniciado.');
};

module.exports = { scheduleUpcomingTaskReminders };