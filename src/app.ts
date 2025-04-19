import express from 'express';
import mongoose from 'mongoose';

const app = express();

app.get('/test', (req,res) => {
    res.json({ message: 'Test123'});
});





export default app;