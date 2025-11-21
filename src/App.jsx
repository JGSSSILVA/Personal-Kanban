import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fetchWeather } from './services/weather';
import CitySearch from './components/CitySearch';
import InteractiveHeader from './components/InteractiveHeader';

function App() {
  // Load from localStorage or default to empty lists
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [doneTodos, setDoneTodos] = useState(() => {
    const saved = localStorage.getItem('doneTodos');
    return saved ? JSON.parse(saved) : [];
  });

  const [newTask, setNewTask] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [loading, setLoading] = useState(false);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('doneTodos', JSON.stringify(doneTodos));
  }, [doneTodos]);

  // Mouse tracking for reactive background
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTask || !newDate || !newLocation) return;

    setLoading(true);
    const weather = await fetchWeather(newLocation, newDate);
    setLoading(false);

    const todo = {
      id: Date.now().toString(),
      task: newTask,
      date: newDate,
      location: newLocation,
      weather,
    };

    setTodos([todo, ...todos]);
    setNewTask('');
    setNewDate('');
    setNewLocation('');
  };

  const handleDelete = (id, isDone) => {
    if (isDone) {
      setDoneTodos(doneTodos.filter(t => t.id !== id));
    } else {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  const handleSaveEdit = (id, isDone, newTaskText) => {
    if (!newTaskText || newTaskText.trim() === "") return;

    const updateList = (list) => list.map(t => t.id === id ? { ...t, task: newTaskText } : t);

    if (isDone) {
      setDoneTodos(updateList(doneTodos));
    } else {
      setTodos(updateList(todos));
    }
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const getList = (id) => id === 'TODO' ? todos : doneTodos;
    const setList = (id, list) => id === 'TODO' ? setTodos(list) : setDoneTodos(list);

    const sourceList = Array.from(getList(source.droppableId));
    const destList = source.droppableId === destination.droppableId ? sourceList : Array.from(getList(destination.droppableId));

    const [removed] = sourceList.splice(source.index, 1);
    destList.splice(destination.index, 0, removed);

    if (source.droppableId === destination.droppableId) {
      setList(source.droppableId, sourceList);
    } else {
      setList(source.droppableId, sourceList);
      setList(destination.droppableId, destList);
    }
  };

  const TodoCard = ({ todo, index, isDone }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(todo.task);

    const onSave = () => {
      handleSaveEdit(todo.id, isDone, editValue);
      setIsEditing(false);
    };

    const onCancel = () => {
      setEditValue(todo.task);
      setIsEditing(false);
    };

    return (
      <Draggable draggableId={todo.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="todo-item"
          >
            <div className="todo-content">
              {isEditing ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="todo-task">{todo.task}</div>
              )}

              <div className="todo-meta">
                <span>📅 {todo.date}</span>
                <span>📍 {todo.location}</span>
              </div>
              <div className="weather-badge">
                {todo.weather}
              </div>
            </div>
            <div className="todo-actions">
              {isEditing ? (
                <>
                  <button className="action-btn" onClick={onSave} style={{ color: '#4ade80', borderColor: '#4ade80' }}>Save</button>
                  <button className="action-btn" onClick={onCancel}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="action-btn" onClick={() => setIsEditing(true)}>Edit</button>
                  <button className="action-btn delete" onClick={() => handleDelete(todo.id, isDone)}>Delete</button>
                </>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="app-container">
      <InteractiveHeader />

      <div className="card">
        <form onSubmit={handleAddTodo}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              required
            />
            <div className="input-group">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                style={{ colorScheme: 'dark' }}
              />
              <CitySearch
                onSelect={(city) => setNewLocation(`${city.name}, ${city.country}`)}
                required
                value={newLocation}
                onChange={setNewLocation}
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Fetching Weather...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          <div className="kanban-column">
            <h2>To Do</h2>
            <Droppable droppableId="TODO">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ minHeight: '100px' }}
                >
                  {todos.map((todo, index) => (
                    <TodoCard key={todo.id} todo={todo} index={index} isDone={false} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="kanban-column">
            <h2>Done</h2>
            <Droppable droppableId="DONE">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ minHeight: '100px' }}
                >
                  {doneTodos.map((todo, index) => (
                    <TodoCard key={todo.id} todo={todo} index={index} isDone={true} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

export default App;
