import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Statement = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const { data } = await API.get('/account/statement');
        setTransactions(data);
      } catch (err) {
        console.error('Failed to load statement');
      } finally {
        setLoading(false);
      }
    };
    fetchStatement();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="page-container">
      <div className="page-card wide">
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
          <h2>Account Statement</h2>
        </div>

        {loading ? (
          <p className="loading">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  // Determine if this row is the user's credit or debit perspective
                  const isCredit = tx.receiver_id === user?.id && tx.transaction_type === 'credit';
                  const isDebit  = tx.sender_id   === user?.id && tx.transaction_type === 'debit';

                  // Show only the row that belongs to this user's perspective
                  if (!isCredit && !isDebit) return null;

                  return (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.created_at)}</td>
                      <td>
                        <span className={`badge ${isCredit ? 'badge-credit' : 'badge-debit'}`}>
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className={isCredit ? 'amount-credit' : 'amount-debit'}>
                        {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                      </td>
                      <td>{tx.sender?.name || '—'}</td>
                      <td>{tx.receiver?.name || '—'}</td>
                      <td>₹{Number(tx.balance_after).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statement;