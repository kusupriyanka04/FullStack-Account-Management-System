import bcrypt from 'bcryptjs';
import supabase from '../config/supabaseClient.js';
import generateToken from '../utils/generateToken.js';

// POST /api/auth/signup
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users1')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user (balance defaults to 10000 in DB)
    const { data: newUser, error } = await supabase
      .from('users1')
      .insert([{ name, email, password: hashedPassword }])
      .select('id, name, email, balance')
      .single();

    if (error) throw error;

    const token = generateToken(newUser.id);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        balance: newUser.balance,
      },
    });
  } catch (err) {
    console.error('SIGNUP ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users1')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};