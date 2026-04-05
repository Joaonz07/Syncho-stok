import { existsSync } from 'fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import { getAllowedOrigins, shouldServeFrontend } from './config/runtime';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();
const publicPath = path.resolve(__dirname, '..', 'public');
const allowedOrigins = getAllowedOrigins();
const canServeFrontend = shouldServeFrontend() && existsSync(path.join(publicPath, 'index.html'));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error('Origin nao permitida pelo CORS.'));
		}
	})
);
app.use(express.json());

if (canServeFrontend) {
	app.use(express.static(publicPath));
}

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (_req, res) => {
	res.json({ status: 'OK' });
});

if (canServeFrontend) {
	app.get('*', (_req, res) => {
		res.sendFile(path.join(publicPath, 'index.html'));
	});
} else {
	app.use((_req, res) => {
		res.status(404).json({ message: 'Rota nao encontrada.' });
	});
}

export default app;
