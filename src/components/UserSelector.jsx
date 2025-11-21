import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function UserSelector({ onSelectUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUserName, setNewUserName] = useState('');
    const [creating, setCreating] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editName, setEditName] = useState('');

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
                .insert([{ name: newUserName.trim() }])
                .select()
                .single();

            if (error) throw error;

            setUsers([...users, data]);
            setNewUserName('');
            setSuccessMessage(`User "${data.name}" created successfully!`);
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Error creating user. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const startEditing = (user) => {
        setEditingUserId(user.id);
        setEditName(user.name);
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditName('');
    };

    const saveEdit = async (id) => {
        if (!editName.trim()) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ name: editName.trim() })
                .eq('id', id);

            if (error) throw error;

            setUsers(users.map(u => u.id === id ? { ...u, name: editName.trim() } : u));
            setEditingUserId(null);
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user name');
        }
    };

    if (loading) return <div className="user-selector-loading">Loading profiles...</div>;

    return (
        <div className="user-selector-container">
            <h2>Who are you?</h2>

            {successMessage && (
                <div className="success-modal">
                    <p>{successMessage}</p>
                    <button onClick={() => {
                        setSuccessMessage(null);
                        // Optionally auto-select the user here if desired, but user asked for "OK"
                    }}>OK</button>
                </div>
            )}

            <div className="user-list">
                {users.map(user => (
                    <div key={user.id} className="user-item-row">
                        {editingUserId === user.id ? (
                            <div className="user-edit-row">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={() => saveEdit(user.id)} className="save-btn">Save</button>
                                <button onClick={cancelEditing} className="cancel-btn">Cancel</button>
                            </div>
                        ) : (
                            <>
                                <button
                                    className="user-btn"
                                    onClick={() => onSelectUser(user)}
                                >
                                    {user.name}
                                </button>
                                <button
                                    className="edit-user-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(user);
                                    }}
                                >
                                    ✏️
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="divider">or</div>

            <form onSubmit={handleCreateUser} className="create-user-form">
                <input
                    type="text"
                    placeholder="New Profile Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    disabled={creating}
                />
                <button type="submit" disabled={creating || !newUserName.trim()}>
                    {creating ? 'Creating...' : 'Create Profile'}
                </button>
            </form>
        </div>
    );
}

export default UserSelector;
