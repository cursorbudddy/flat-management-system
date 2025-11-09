import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../../api';
import { FaUser, FaPlus, FaEdit, FaTrash, FaKey, FaTimes, FaSave } from 'react-icons/fa';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'resetPassword'
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    is_active: true
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, user = null) => {
    setModalMode(mode);
    setSelectedUser(user);

    if (mode === 'create') {
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'user',
        is_active: true
      });
    } else if (mode === 'edit' && user) {
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active
      });
    } else if (mode === 'resetPassword') {
      setResetPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        await createUser(formData);
        alert('User created successfully');
      } else if (modalMode === 'edit') {
        await updateUser(selectedUser.id, {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active
        });
        alert('User updated successfully');
      }

      fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (resetPasswordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      await resetUserPassword(selectedUser.id, resetPasswordData.newPassword);
      alert('Password reset successfully');
      handleCloseModal();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      alert('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal('create')}>
          <FaPlus /> Create User
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: '600' }}>{user.username}</td>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenModal('edit', user)}
                        title="Edit User"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenModal('resetPassword', user)}
                        title="Reset Password"
                      >
                        <FaKey />
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDelete(user)}
                        title="Delete User"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'create' && 'Create New User'}
                {modalMode === 'edit' && 'Edit User'}
                {modalMode === 'resetPassword' && 'Reset Password'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              {modalMode === 'resetPassword' ? (
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={resetPasswordData.newPassword}
                      onChange={(e) => setResetPasswordData(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }))}
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={resetPasswordData.confirmPassword}
                      onChange={(e) => setResetPasswordData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))}
                      required
                      minLength="6"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                      <FaTimes /> Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <FaSave /> Reset Password
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label required">Username</label>
                    <input
                      type="text"
                      name="username"
                      className="form-input"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      disabled={modalMode === 'edit'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      className="form-input"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {modalMode === 'create' && (
                    <div className="form-group">
                      <label className="form-label required">Password</label>
                      <input
                        type="password"
                        name="password"
                        className="form-input"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength="6"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label required">Role</label>
                    <select
                      name="role"
                      className="form-select"
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        style={{ marginRight: '8px' }}
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                      <FaTimes /> Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      <FaSave /> {modalMode === 'create' ? 'Create' : 'Update'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
