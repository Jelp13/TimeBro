// Variables globales
let tasks = [];
let currentFilter = {
    category: 'todas',
    priority: 'todas',
    status: 'todas'
}

// Obtener clase de prioridad
function getPriorityClass(priority) {
    switch (priority) {
        case 'alta': return 'high';
        case 'media': return 'medium';
        case 'baja': return 'low';
        default: return 'low';
    }
}

// Formatear fecha
function formatDate(date) {
    return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

// Capitalizar primera letra
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Crear nueva tarea
function createTask(taskData) {
    const newTask = {
        id: Date.now().toString(),
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        reminder: taskData.reminder,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    saveTasks();
    updateTaskList();
    updateCalendarView();
    updateStats();
    
    // Establecer recordatorio si está configurado
    if (newTask.reminder) {
        scheduleReminder(newTask);
    }
    
    return newTask;
}

// Editar tarea
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-description').value = task.description;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-due-date').value = task.dueDate;
    
    if (task.reminder) {
        const reminderDateTime = new Date(task.reminder);
        // Formatear fecha y hora para el input datetime-local
        const formattedDate = reminderDateTime.toISOString().slice(0, 16);
        document.getElementById('task-reminder').value = formattedDate;
    } else {
        document.getElementById('task-reminder').value = '';
    }
    
    document.getElementById('modal-title').textContent = 'Editar Tarea';
    document.getElementById('task-modal-overlay').style.display = 'flex';
}

// Actualizar tarea
function updateTask(taskId, taskData) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    const updatedTask = {
        ...tasks[taskIndex],
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        reminder: taskData.reminder,
        updatedAt: new Date().toISOString()
    };
    
    tasks[taskIndex] = updatedTask;
    saveTasks();
    updateTaskList();
    updateCalendarView();
    updateStats();
    
    // Actualizar recordatorio si está configurado
    if (updatedTask.reminder && !updatedTask.completed) {
        scheduleReminder(updatedTask);
    }
    
    return updatedTask;
}

// Cambiar estado de completado de tarea
function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    if (tasks[taskIndex].completed) {
        tasks[taskIndex].completedAt = new Date().toISOString();
    } else {
        delete tasks[taskIndex].completedAt;
    }
    
    saveTasks();
    updateTaskList();
    updateStats();
}

// Eliminar tarea
function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    updateTaskList();
    updateCalendarView();
    updateStats();
    showNotification('Tarea eliminada exitosamente');
}

// Programar recordatorio
function scheduleReminder(task) {
    const reminderDate = new Date(task.reminder);
    const now = new Date();
    
    if (reminderDate > now) {
        const timeUntilReminder = reminderDate.getTime() - now.getTime();
        
        setTimeout(() => {
            if (!tasks.find(t => t.id === task.id)?.completed) {
                showNotification(`¡Recordatorio! Tarea "${task.title}" vence pronto.`);
                
                // Crear notificación nativa si es posible
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('TaskMaster - Recordatorio', {
                        body: `¡La tarea "${task.title}" vence pronto!`,
                        icon: '/favicon.ico'
                    });
                }
            }
        }, timeUntilReminder);
    }
}

// Mostrar notificación en la interfaz
function showNotification(message) {
    const notificationElement = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notificationMessage.textContent = message;
    notificationElement.classList.add('show');
    
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 3000);
}

// Actualizar vista de calendario
function updateCalendarView() {
    const calendarView = document.querySelector('.calendar-view');
    if (!calendarView) return;
    
    // Si no hay mes actual guardado, usar el actual
    if (typeof window.currentCalendarMonth === 'undefined') {
        const today = new Date();
        window.currentCalendarMonth = today.getMonth();
        window.currentCalendarYear = today.getFullYear();
    }
    
    updateCalendarViewForMonth(window.currentCalendarYear, window.currentCalendarMonth);
}

// Actualizar vista de calendario para un mes específico
function updateCalendarViewForMonth(year, month) {
    const calendarView = document.querySelector('.calendar-view');
    if (!calendarView) return;
    
    calendarView.innerHTML = '';
    
    // Obtener fecha actual para comparar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Crear navegación del calendario
    const navigationContainer = document.createElement('div');
    navigationContainer.className = 'calendar-navigation';
    
    const prevButton = document.createElement('button');
    prevButton.className = 'btn btn-primary';
    prevButton.textContent = '← Anterior';
    prevButton.addEventListener('click', () => changeMonth(-1));
    
    const monthYearText = document.createElement('h3');
    monthYearText.className = 'calendar-title';
    monthYearText.textContent = `${getMonthName(month)} ${year}`;
    
    const nextButton = document.createElement('button');
    nextButton.className = 'btn btn-primary';
    nextButton.textContent = 'Siguiente →';
    nextButton.addEventListener('click', () => changeMonth(1));
    
    navigationContainer.appendChild(prevButton);
    navigationContainer.appendChild(monthYearText);
    navigationContainer.appendChild(nextButton);
    
    // Crear contenedor de días de la semana
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekDaysContainer = document.createElement('div');
    weekDaysContainer.className = 'calendar-weekdays';
    
    weekDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-weekday';
        dayHeader.textContent = day;
        weekDaysContainer.appendChild(dayHeader);
    });
    
    // Obtener información del mes
    let firstDay = new Date(year, month, 1);
    let lastDay = new Date(year, month + 1, 0);
    let totalDays = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay();
    
    // Crear contenedor de días
    const daysContainer = document.createElement('div');
    daysContainer.className = 'calendar-days';
    
    // Agregar días vacíos al inicio si es necesario
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        daysContainer.appendChild(emptyDay);
    }
    
    // Agregar días del mes
    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(year, month, day);
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        
        const dayTasks = document.createElement('div');
        dayTasks.className = 'calendar-day-tasks';
        
        // Filtrar tareas para este día
        const tasksForDay = tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate.getDate() === day && 
                   taskDate.getMonth() === month && 
                   taskDate.getFullYear() === year;
        });
        
        if (tasksForDay.length > 0) {
            tasksForDay.slice(0, 2).forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'calendar-task-item';
                taskItem.textContent = task.title;
                taskItem.style.backgroundColor = task.completed ? '#e9ecef' : getPriorityBackgroundColor(task.priority);
                taskItem.style.color = task.completed ? '#6c757d' : '#000';
                if (task.completed) {
                    taskItem.style.textDecoration = 'line-through';
                }
                dayTasks.appendChild(taskItem);
            });
            
            if (tasksForDay.length > 2) {
                const moreLink = document.createElement('div');
                moreLink.className = 'calendar-more-tasks';
                moreLink.textContent = `+ ${tasksForDay.length - 2} más`;
                dayTasks.appendChild(moreLink);
            }
        }
        
        dayElement.appendChild(dayHeader);
        dayElement.appendChild(dayTasks);
        daysContainer.appendChild(dayElement);
    }
    
    // Agregar días vacíos al final si es necesario para completar la última fila
    const totalCells = startingDayOfWeek + totalDays;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            daysContainer.appendChild(emptyDay);
        }
    }
    
    calendarView.appendChild(navigationContainer);
    calendarView.appendChild(weekDaysContainer);
    calendarView.appendChild(daysContainer);
}

// Obtener color de fondo según prioridad
function getPriorityBackgroundColor(priority) {
    switch (priority) {
        case 'alta': return '#ffe5e9';
        case 'media': return '#fff3cd';
        case 'baja': return '#d4edda';
        default: return '#f8f9fa';
    }
}

// Obtener nombre del mes
function getMonthName(monthIndex) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
}

// Cambiar mes en el calendario
function changeMonth(increment) {
    // Si no hay mes actual guardado, usar el actual
    if (typeof window.currentCalendarMonth === 'undefined') {
        const today = new Date();
        window.currentCalendarMonth = today.getMonth();
        window.currentCalendarYear = today.getFullYear();
    }
    
    window.currentCalendarMonth += increment;
    
    // Ajustar año si es necesario
    if (window.currentCalendarMonth > 11) {
        window.currentCalendarMonth = 0;
        window.currentCalendarYear++;
    } else if (window.currentCalendarMonth < 0) {
        window.currentCalendarMonth = 11;
        window.currentCalendarYear--;
    }
    
    // Actualizar la vista del calendario con el nuevo mes
    updateCalendarViewForMonth(window.currentCalendarYear, window.currentCalendarMonth);
}

// Actualizar estadísticas
function updateStats() {
    // Contar tareas totales y completadas
    const totalTasks = tasks.length;
    const completedTasksCount = tasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
    
    // Actualizar indicadores
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasksCount;
    document.getElementById('completion-rate').textContent = `${completionRate}%`;
    
    // Actualizar gráfico
    updateChart();
}

// Actualizar gráfico de estadísticas
function updateChart() {
    // Contar tareas por categoría
    const categoryCounts = {
        trabajo: 0,
        estudio: 0,
        personal: 0
    };
    
    // Contar tareas completadas por categoría
    const completedCategoryCounts = {
        trabajo: 0,
        estudio: 0,
        personal: 0
    };
    
    tasks.forEach(task => {
        if (task.category in categoryCounts) {
            categoryCounts[task.category]++;
            
            if (task.completed) {
                completedCategoryCounts[task.category]++;
            }
        }
    });
    
    // Configurar el gráfico
    const ctx = document.getElementById('tasks-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente si lo hay
    if (window.tasksChart) {
        window.tasksChart.destroy();
    }
    
    // Crear nuevo gráfico
    window.tasksChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Trabajo', 'Estudio', 'Personal'],
            datasets: [
                {
                    label: 'Total',
                    data: [categoryCounts.trabajo, categoryCounts.estudio, categoryCounts.personal],
                    backgroundColor: 'rgba(67, 97, 238, 0.5)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Completadas',
                    data: [completedCategoryCounts.trabajo, completedCategoryCounts.estudio, completedCategoryCounts.personal],
                    backgroundColor: 'rgba(45, 198, 83, 0.5)',
                    borderColor: 'rgba(45, 198, 83, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.8,
            layout: {
                padding: {
                    left: 5,
                    right: 5,
                    top: 0,
                    bottom: 0
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Elementos DOM
    const taskForm = document.getElementById('task-form');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModalOverlay = document.getElementById('task-modal-overlay');
    const closeBtn = document.querySelector('.close-btn');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const applyFiltersBtn = document.getElementById('apply-filters');
    
    // Verificar que los elementos existen antes de agregar event listeners
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskFormSubmit);
    }
    
    // Botón de añadir tarea
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', function() {
            resetTaskForm();
            const modalTitle = document.getElementById('modal-title');
            const modal = document.getElementById('task-modal-overlay');
            
            if (modalTitle) {
                modalTitle.textContent = 'Nueva Tarea';
            }
            
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // Cerrar modal
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const modal = document.getElementById('task-modal-overlay');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Cerrar modal haciendo clic fuera
    if (taskModalOverlay) {
        taskModalOverlay.addEventListener('click', function(e) {
            if (e.target === taskModalOverlay) {
                taskModalOverlay.style.display = 'none';
            }
        });
    }
    
    // Cambiar tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar tabs y contenidos activos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activar el tab y contenido seleccionados
            tab.classList.add('active');
            const tabContentId = tab.getAttribute('data-tab');
            const tabContent = document.getElementById(tabContentId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
    
    // Aplicar filtros
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            const filterCategory = document.getElementById('filter-category');
            const filterPriority = document.getElementById('filter-priority');
            const filterStatus = document.getElementById('filter-status');
            
            if (filterCategory && filterPriority && filterStatus) {
                currentFilter = {
                    category: filterCategory.value,
                    priority: filterPriority.value,
                    status: filterStatus.value
                };
                
                updateTaskList();
            }
        });
    }
    
    // Establecer fecha mínima para campos de fecha
    const today = new Date().toISOString().split('T')[0];
    const dueDateInput = document.getElementById('task-due-date');
    const reminderInput = document.getElementById('task-reminder');
    
    if (dueDateInput) {
        dueDateInput.min = today;
    }
    
    if (reminderInput) {
        reminderInput.min = new Date().toISOString().slice(0, 16);
    }
}

// Manejar envío del formulario de tareas
function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title-input').value,
        description: document.getElementById('task-description').value,
        category: document.getElementById('task-category').value,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-due-date').value,
        reminder: document.getElementById('task-reminder').value
    };
    
    if (taskId) {
        // Actualizar tarea existente
        updateTask(taskId, taskData);
        showNotification('Tarea actualizada exitosamente');
    } else {
        // Crear nueva tarea
        createTask(taskData);
        showNotification('Tarea creada exitosamente');
    }
    
    // Cerrar modal
    document.getElementById('task-modal-overlay').style.display = 'none';
    document.getElementById('task-form').reset();
}

// Reinicia el formulario de tareas
function resetTaskForm() {
    document.getElementById('task-id').value = '';
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-category').value = 'trabajo';
    document.getElementById('task-priority').value = 'media';
    document.getElementById('task-due-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('task-reminder').value = '';
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    setupEventListeners();
    requestNotificationPermission();
});;

// Solicitar permiso para notificaciones
function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
}

// Cargar tareas desde localStorage
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
    
    updateTaskList();
    updateCalendarView();
    updateStats();
    
    // Establecer recordatorios para tareas existentes
    tasks.forEach(task => {
        if (task.reminder && !task.completed) {
            const reminderDate = new Date(task.reminder);
            const now = new Date();
            if (reminderDate > now) {
                scheduleReminder(task);
            }
        }
    });
}

// Guardar tareas en localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Actualizar la lista de tareas
function updateTaskList() {
    const taskContainer = document.getElementById('tasks-container');
    taskContainer.innerHTML = '';
    
    // Filtrar tareas
    const filteredTasks = tasks.filter(task => {
        return (currentFilter.category === 'todas' || task.category === currentFilter.category) &&
               (currentFilter.priority === 'todas' || task.priority === currentFilter.priority) &&
               (currentFilter.status === 'todas' || 
                (currentFilter.status === 'completada' && task.completed) || 
                (currentFilter.status === 'pendiente' && !task.completed));
    });
    
    if (filteredTasks.length === 0) {
        taskContainer.innerHTML = '<p class="text-center">No hay tareas que mostrar.</p>';
        return;
    }
    
    // Ordenar tareas (primero no completadas, luego por prioridad y fecha)
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        const priorityOrder = { alta: 1, media: 2, baja: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    // Generar elementos de tareas
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskContainer.appendChild(taskElement);
    });
}

// Crear elemento de tarea
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item priority-${getPriorityClass(task.priority)}`;
    if (task.completed) {
        taskElement.classList.add('completed-task');
    }
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
    
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    const taskTitle = document.createElement('div');
    taskTitle.className = 'task-title';
    taskTitle.textContent = task.title;
    
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    
    const dueDate = document.createElement('span');
    const dueDateObj = new Date(task.dueDate);
    dueDate.textContent = `Vence: ${formatDate(dueDateObj)}`;
    
    // Verificar si la tarea está próxima a vencer
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (!task.completed && dueDateObj <= tomorrow && dueDateObj >= today) {
        dueDate.classList.add('due-soon');
    }
    
    const category = document.createElement('span');
    category.className = `task-category category-${task.category}`;
    category.textContent = capitalizeFirstLetter(task.category);
    
    taskInfo.appendChild(dueDate);
    taskInfo.appendChild(category);
    
    taskContent.appendChild(taskTitle);
    taskContent.appendChild(taskInfo);
    
    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-warning';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => editTask(task.id));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    taskActions.appendChild(editBtn);
    taskActions.appendChild(deleteBtn);
    
    taskElement.appendChild(checkbox);
    taskElement.appendChild(taskContent);
    taskElement.appendChild(taskActions);
    
    return taskElement;
}