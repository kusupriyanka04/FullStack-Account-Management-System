import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import protect from './middlewares/authMiddleware.js';
import { getUsers } from './controllers/accountController.js';

dotenv.config();

const app = express();

//console.log('SUPABASE_URL:', process.env.SUPABASE_URL);

app.use(cors({
  origin: 'http://localhost:5173', // Your React dev server
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);

// A separate /api/users route that uses the same controller

app.get('/api/users', protect, getUsers);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});