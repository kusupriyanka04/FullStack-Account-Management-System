import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const SendMoney = () => {
  const [users, setUsers] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await API.get('/users');
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users');
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const { data } = await API.post('/account/transfer', {
        receiverEmail,
        amount: Number(amount),
      });
      setMessage(data.message);
      setAmount('');
      setReceiverEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-card">
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
          <h2>Send Money</h2>
        </div>

        {message && <div className="success-msg">{message}</div>}
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Receiver</label>
            <select
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              required
            >
              <option value="">-- Choose a user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Money'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendMoney;