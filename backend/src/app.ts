import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();
const publicPath = path.resolve(__dirname, '..', 'public');

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (_req, res) => {
	res.json({ status: 'OK' });
});

// SPA catch-all: serve React index.html for every non-API route
app.get('*', (_req, res) => {
	res.sendFile(path.join(publicPath, 'index.html'));
});

export default app;
