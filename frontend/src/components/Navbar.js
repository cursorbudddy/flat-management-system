import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { FaHome, FaBuilding, FaDoorOpen, FaUsers, FaMoneyBillWave, FaFileInvoiceDollar, FaChartBar, FaUsersCog, FaCheckCircle, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FaHome />, roles: ['admin', 'user'] },
    { path: '/buildings', label: 'Buildings', icon: <FaBuilding />, roles: ['admin'] },
    { path: '/flats', label: 'Flats', icon: <FaDoorOpen />, roles: ['admin', 'user'] },
    { path: '/tenants', label: 'Tenants', icon: <FaUsers />, roles: ['admin'] },
    { path: '/payments', label: 'Payments', icon: <FaMoneyBillWave />, roles: ['admin'] },
    { path: '/payment-entry', label: 'Payment Entry', icon: <FaMoneyBillWave />, roles: ['admin', 'user'] },
    { path: '/expenses', label: 'Expenses', icon: <FaFileInvoiceDollar />, roles: ['admin', 'user'] },
    { path: '/admin/expense-approval', label: 'Expense Approval', icon: <FaCheckCircle />, roles: ['admin'] },
    { path: '/admin/reports', label: 'Reports', icon: <FaChartBar />, roles: ['admin'] },
    { path: '/admin/users', label: 'User Management', icon: <FaUsersCog />, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(user?.role)
  );

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <FaBuilding className="brand-icon" />
          <span>Flat Management</span>
        </Link>
        <ul className="navbar-menu">
          {filteredNavItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="navbar-user">
          <span className="navbar-user-name">{user?.full_name}</span>
          <span className={`navbar-user-role ${user?.role === 'admin' ? 'role-admin' : 'role-user'}`}>
            {user?.role}
          </span>
          <button className="navbar-logout" onClick={handleLogout} title="Logout">
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
