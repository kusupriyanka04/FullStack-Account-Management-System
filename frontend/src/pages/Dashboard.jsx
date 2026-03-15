import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data } = await API.get('/account/balance');
        setBalance(data.balance);
      } catch (err) {
        console.error('Failed to fetch balance');
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>Hello, {user?.name} 👋</h2>
          <p className="text-muted">{user?.email}</p>
        </div>
        <button onClick={logout} className="btn-logout">Logout</button>
      </header>

      <div className="balance-card">
        <p className="balance-label">Current Balance</p>
        {loading ? (
          <p className="balance-amount">Loading...</p>
        ) : (
          <p className="balance-amount">
            ₹{Number(balance).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      <div className="dashboard-actions">
        <Link to="/send-money" className="action-card">
          <span className="action-icon">💸</span>
          <span>Send Money</span>
        </Link>
        <Link to="/statement" className="action-card">
          <span className="action-icon">📋</span>
          <span>Statement</span>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;