import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fetchWeather } from './services/weather';
import CitySearch from './components/CitySearch';
import InteractiveHeader from './components/InteractiveHeader';
import UserSelector from './components/UserSelector';
import { supabase } from './supabaseClient';

function App() {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [todos, setTodos] = useState([]);
  const [doneTodos, setDoneTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch todos when selected users change
  useEffect(() => {
    if (selectedUsers.length > 0) {
      fetchTodos();
      // Default assignee to first selected user if not set or not in selection
      if (!assigneeId || !selectedUsers.find(u => u.id === assigneeId)) {
        setAssigneeId(selectedUsers[0].id);
      }
    } else {
      setTodos([]);
      setDoneTodos([]);
    }
  }, [selectedUsers]);

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const fetchTodos = async () => {
    try {
      const userIds = selectedUsers.map(u => u.id);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const todoList = data.filter(t => !t.is_done);
      const doneList = data.filter(t => t.is_done);

      setTodos(todoList);
      setDoneTodos(doneList);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

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
    if (!newTask || !newDate || !newLocation || !assigneeId) return;

    setLoading(true);
    const weather = await fetchWeather(newLocation, newDate);
    setLoading(false);

    const newTodo = {
      user_id: assigneeId,
      task: newTask,
      date: newDate,
      location: newLocation,
      weather,
      is_done: false
    };

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([newTodo])
        .select()
        .single();

      if (error) throw error;

      setTodos([data, ...todos]);
      setNewTask('');
      setNewDate('');
      setNewLocation('');
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add task');
    }
  };

  const handleDelete = async (id, isDone) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (isDone) {
        setDoneTodos(doneTodos.filter(t => t.id !== id));
      } else {
        setTodos(todos.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleSaveEdit = async (id, isDone, newTaskText) => {
    if (!newTaskText || newTaskText.trim() === "") return;

    try {
      const { error } = await supabase
        .from('todos')
        .update({ task: newTaskText })
        .eq('id', id);

      if (error) throw error;

      const updateList = (list) => list.map(t => t.id === id ? { ...t, task: newTaskText } : t);

      if (isDone) {
        setDoneTodos(updateList(doneTodos));
      } else {
        setTodos(updateList(todos));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const isMovingToDone = destination.droppableId === 'DONE';

    // Optimistic UI Update
    const getList = (id) => id === 'TODO' ? todos : doneTodos;
    const setList = (id, list) => id === 'TODO' ? setTodos(list) : setDoneTodos(list);

    const sourceList = Array.from(getList(source.droppableId));
    const destList = source.droppableId === destination.droppableId ? sourceList : Array.from(getList(destination.droppableId));

    const [removed] = sourceList.splice(source.index, 1);

    // Update the item's status if moving between columns
    const updatedItem = { ...removed, is_done: isMovingToDone };

    destList.splice(destination.index, 0, updatedItem);

    if (source.droppableId === destination.droppableId) {
      setList(source.droppableId, sourceList);
    } else {
      setList(source.droppableId, sourceList);
      setList(destination.droppableId, destList);
    }

    // Persist to Supabase if status changed
    if (source.droppableId !== destination.droppableId) {
      try {
        const { error } = await supabase
          .from('todos')
          .update({ is_done: isMovingToDone })
          .eq('id', removed.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error moving todo:', error);
        // Ideally revert UI here on error
      }
    }
  };

  const TodoCard = ({ todo, index, isDone }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(todo.task);

    // Find user for this todo to get color
    const user = selectedUsers.find(u => u.id === todo.user_id);
    const userColor = user ? user.color : '#38bdf8'; // Default or fallback

    const onSave = () => {
      handleSaveEdit(todo.id, isDone, editValue);
      setIsEditing(false);
    };

    const onCancel = () => {
      setEditValue(todo.task);
      setIsEditing(false);
    };

    return (
      <Draggable draggableId={todo.id.toString()} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="todo-item"
            style={{ borderLeft: `4px solid ${userColor}` }}
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
                {user && <span style={{ color: userColor, fontSize: '0.7rem' }}>👤 {user.name}</span>}
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

      <UserSelector selectedUsers={selectedUsers} onToggleUser={toggleUser} />

      {selectedUsers.length > 0 && (
        <>
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

                {/* Assignee Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Assign to:</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(Number(e.target.value))}
                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    {selectedUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
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
        </>
      )}
    </div>
  );
}

export default App;
