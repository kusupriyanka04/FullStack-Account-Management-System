import supabase from '../config/supabaseClient.js';

// GET /api/account/balance
export const getBalance = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('balance, name, email')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Balance fetch error:', error);
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('BALANCE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/account/statement
export const getStatement = async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Fetch transactions
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

    // Step 2: Collect unique user IDs
    const userIds = [
      ...new Set([
        ...transactions.map((t) => t.sender_id),
        ...transactions.map((t) => t.receiver_id),
      ]),
    ];

    // Step 3: Fetch user details
    const { data: users, error: usersError } = await supabase
      .from('users1')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      throw usersError;
    }

    // Step 4: Build lookup map
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u;
    });

    // Step 5: Enrich transactions with sender/receiver names
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
    // Get sender
    const { data: sender, error: senderError } = await supabase
      .from('users1')
      .select('id, name, balance')
      .eq('id', senderId)
      .single();

    if (senderError || !sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Check balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Get receiver
    const { data: receiver, error: receiverError } = await supabase
      .from('users1')
      .select('id, name, balance')
      .eq('email', receiverEmail)
      .maybeSingle();

    if (receiverError || !receiver) {
      return res.status(404).json({ message: 'Receiver not found. Check the email.' });
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    const newSenderBalance = Number(sender.balance) - Number(amount);
    const newReceiverBalance = Number(receiver.balance) + Number(amount);

    // Deduct from sender
    const { error: deductError } = await supabase
      .from('users1')
      .update({ balance: newSenderBalance })
      .eq('id', senderId);

    if (deductError) throw deductError;

    // Add to receiver
    const { error: addError } = await supabase
      .from('users1')
      .update({ balance: newReceiverBalance })
      .eq('id', receiver.id);

    if (addError) throw addError;

    // Insert DEBIT record for sender
    const { error: debitError } = await supabase
      .from('transactions')
      .insert([{
        sender_id: senderId,
        receiver_id: receiver.id,
        amount: Number(amount),
        transaction_type: 'debit',
        balance_after: newSenderBalance,
      }]);

    if (debitError) throw debitError;

    // Insert CREDIT record for receiver
    const { error: creditError } = await supabase
      .from('transactions')
      .insert([{
        sender_id: senderId,
        receiver_id: receiver.id,
        amount: Number(amount),
        transaction_type: 'credit',
        balance_after: newReceiverBalance,
      }]);

    if (creditError) throw creditError;

    res.json({
      message: `₹${amount} transferred to ${receiver.name} successfully`,
      newBalance: newSenderBalance,
    });
  } catch (err) {
    console.error('TRANSFER ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users1')
      .select('id, name, email')
      .neq('id', req.user.id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};