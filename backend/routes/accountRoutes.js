import express from 'express';
import protect from '../middlewares/authMiddleware.js';
import {
  getBalance,
  getStatement,
  transfer,
  getUsers,
} from '../controllers/accountController.js';

const router = express.Router();

router.get('/balance', protect, getBalance);
router.get('/statement', protect, getStatement);
router.post('/transfer', protect, transfer);
router.get('/users', protect, getUsers); // placed here but no auth prefix needed

export default router;