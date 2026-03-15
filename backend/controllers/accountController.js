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
export const getStatement = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all transactions where user is sender OR receiver
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        transaction_type,
        balance_after,
        created_at,
        sender_id,
        receiver_id,
        sender:users!transactions_sender_id_fkey(name, email),
        receiver:users!transactions_receiver_id_fkey(name, email)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(transactions);
  } catch (err) {
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