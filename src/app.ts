import express from 'express';
import mongoose from 'mongoose';

const app = express();

app.use(express.json());

const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);


app.get('/test', (req,res) => {
    res.json({ message: 'Test123'});
});

export default app;