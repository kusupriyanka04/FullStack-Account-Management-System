import supabase from '../config/supabaseClient.js';

// GET /api/account/balance
export const getBalance = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users1')
      .select('balance, name, email')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/account/statement
// GET /api/account/statement
export const getStatement = async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Fetch all transactions for this user
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Transaction fetch error:', error);
      throw error;
    }

    if (!transactions || transactions.length === 0) {
      return res.json([]);
    }

    // Step 2: Collect all unique user IDs from transactions
    const userIds = [
      ...new Set([
        ...transactions.map((t) => t.sender_id),
        ...transactions.map((t) => t.receiver_id),
      ]),
    ];

    // Step 3: Fetch all those users in one query
    const { data: users, error: usersError } = await supabase
      .from('users1')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      throw usersError;
    }

    // Step 4: Create a lookup map { userId -> user }
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u;
    });

    // Step 5: Attach sender and receiver info to each transaction
    const enriched = transactions.map((tx) => ({
      ...tx,
      sender: userMap[tx.sender_id] || null,
      receiver: userMap[tx.receiver_id] || null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('STATEMENT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/account/transfer
export const transfer = async (req, res) => {
  const { receiverEmail, amount } = req.body;
  const senderId = req.user.id;

  if (!receiverEmail || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Valid receiver and amount required' });
  }

  try {
    // 1. Get sender's current balance
    const { data: sender, error: senderError } = await supabase
      .from('users1')
      .select('id, name, balance')
      .eq('id', senderId)
      .single();

    if (senderError || !sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // 2. Check sufficient balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 3. Get receiver
    const { data: receiver, error: receiverError } = await supabase
      .from('users1')
      .select('id, name, balance')
      .eq('email', receiverEmail)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ message: 'Receiver not found. Check the email.' });
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    const newSenderBalance = sender.balance - amount;
    const newReceiverBalance = receiver.balance + amount;

    // 4. Deduct from sender
    const { error: deductError } = await supabase
      .from('users1')
      .update({ balance: newSenderBalance })
      .eq('id', senderId);

    if (deductError) throw deductError;

    // 5. Add to receiver
    const { error: addError } = await supabase
      .from('users1')
      .update({ balance: newReceiverBalance })
      .eq('id', receiver.id);

    if (addError) throw addError;

    // 6. Insert DEBIT record for sender
    const { error: debitError } = await supabase
      .from('transactions')
      .insert([{
        sender_id: senderId,
        receiver_id: receiver.id,
        amount,
        transaction_type: 'debit',
        balance_after: newSenderBalance,
      }]);

    if (debitError) throw debitError;

    // 7. Insert CREDIT record for receiver
    const { error: creditError } = await supabase
      .from('transactions')
      .insert([{
        sender_id: senderId,
        receiver_id: receiver.id,
        amount,
        transaction_type: 'credit',
        balance_after: newReceiverBalance,
      }]);

    if (creditError) throw creditError;

    res.json({
      message: `₹${amount} transferred to ${receiver.name} successfully`,
      newBalance: newSenderBalance,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/users — search users to send money to
export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users1')
      .select('id, name, email')
      .neq('id', req.user.id); // Exclude the logged-in user

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};