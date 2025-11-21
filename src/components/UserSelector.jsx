import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function UserSelector({ selectedUsers, onToggleUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUserName, setNewUserName] = useState('');
    const [newUserColor, setNewUserColor] = useState('#38bdf8');
    const [creating, setCreating] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    // Editing state
    const [editingUserId, setEditingUserId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    // Deleting state
    const [deletingUserId, setDeletingUserId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUserName.trim()) return;

        setCreating(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([{ name: newUserName.trim(), color: newUserColor }])
                .select()
                .single();

            if (error) throw error;

            setUsers([...users, data]);
            setNewUserName('');
            setNewUserColor('#38bdf8');
            setSuccessMessage(`User "${data.name}" created successfully!`);
            onToggleUser(data); // Auto-select new user
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === '23505') { // Unique violation
                alert('Username already exists. Please choose another.');
            } else {
                alert('Error creating user. Please try again.');
            }
        } finally {
            setCreating(false);
        }
    };

    const confirmDeleteUser = async (id) => {
        try {
            // First delete todos (cascade might not be set up, so safe to do manual)
            await supabase.from('todos').delete().eq('user_id', id);

            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw error;

            setUsers(users.filter(u => u.id !== id));
            setDeletingUserId(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user.');
        }
    };

    const startEditing = (user) => {
        setEditingUserId(user.id);
        setEditName(user.name);
        setEditColor(user.color || '#38bdf8');
        setDeletingUserId(null); // Cancel delete if active
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditName('');
        setEditColor('');
    };

    const saveEdit = async (id) => {
        if (!editName.trim()) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ name: editName.trim(), color: editColor })
                .eq('id', id);

            if (error) throw error;

            setUsers(users.map(u => u.id === id ? { ...u, name: editName.trim(), color: editColor } : u));
            setEditingUserId(null);
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user');
        }
    };

    if (loading) return <div className="user-selector-loading">Loading profiles...</div>;

    return (
        <div className="user-selector-container">
            <h2>Select Users</h2>

            {successMessage && (
                <div className="success-modal">
                    <p>{successMessage}</p>
                    <button onClick={() => setSuccessMessage(null)}>OK</button>
                </div>
            )}

            <div className="user-list">
                {users.map(user => {
                    const isSelected = selectedUsers.some(u => u.id === user.id);
                    const isEditing = editingUserId === user.id;
                    const isDeleting = deletingUserId === user.id;

                    return (
                        <div key={user.id} className={`user-item-row ${isSelected ? 'selected' : ''}`} style={{ borderColor: isSelected ? user.color : 'transparent' }}>
                            {isEditing ? (
                                <div className="user-edit-row">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        autoFocus
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="color"
                                        value={editColor}
                                        onChange={(e) => setEditColor(e.target.value)}
                                        style={{ width: '40px', padding: '0.25rem', height: 'auto' }}
                                    />
                                    <button onClick={() => saveEdit(user.id)} className="save-btn">Save</button>
                                    <button onClick={cancelEditing} className="cancel-btn">Cancel</button>
                                </div>
                            ) : isDeleting ? (
                                <div className="user-edit-row" style={{ justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ color: '#f87171', fontSize: '0.9rem', alignSelf: 'center' }}>Delete {user.name}?</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => confirmDeleteUser(user.id)} className="delete-confirm-btn">Yes, Delete</button>
                                        <button onClick={() => setDeletingUserId(null)} className="cancel-btn">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="user-btn"
                                        onClick={() => onToggleUser(user)}
                                        style={{
                                            borderLeft: `4px solid ${user.color}`,
                                            background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                                        }}
                                    >
                                        {user.name} {isSelected && '✓'}
                                    </button>
                                    <button
                                        className="edit-user-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(user);
                                        }}
                                        title="Edit User"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="delete-user-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingUserId(user.id);
                                            setEditingUserId(null);
                                        }}
                                        title="Delete User"
                                    >
                                        🗑️
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="divider">or create new</div>

            <form onSubmit={handleCreateUser} className="create-user-form">
                <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="New Profile Name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        disabled={creating}
                        style={{ flex: 1 }}
                    />
                    <input
                        type="color"
                        value={newUserColor}
                        onChange={(e) => setNewUserColor(e.target.value)}
                        style={{ width: '50px', padding: '0.25rem', height: 'auto' }}
                        title="Choose User Color"
                    />
                </div>
                <button type="submit" disabled={creating || !newUserName.trim()}>
                    {creating ? 'Creating...' : 'Create Profile'}
                </button>
            </form>
        </div>
    );
}

export default UserSelector;
