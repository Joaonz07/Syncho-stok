import { existsSync } from 'fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { logSecurityEvent } from './services/securityLogger';
import {
	attachRequestId,
	blockSuspiciousRequests,
	createRateLimit,
	requestAuditLogger,
	sanitizeInput
} from './middleware/securityMiddleware';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import { getAllowedOrigins, shouldServeFrontend } from './config/runtime';
import dashboardRoutes from './routes/dashboardRoutes';
import externalIntegrationRoutes from './routes/externalIntegrationRoutes';

const app = express();
const publicPath = path.resolve(__dirname, '..', 'public');
const allowedOrigins = getAllowedOrigins();
const canServeFrontend = shouldServeFrontend() && existsSync(path.join(publicPath, 'index.html'));
const globalRateLimit = createRateLimit({
	keyPrefix: 'global',
	maxRequests: 300,
	windowMs: 60_000,
	message: 'Limite global de requisicoes excedido.'
});
const authRateLimit = createRateLimit({
	keyPrefix: 'auth',
	maxRequests: 20,
	windowMs: 60_000,
	message: 'Muitas tentativas de autenticacao. Aguarde alguns instantes.'
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(attachRequestId);
app.use(
	helmet({
		crossOriginResourcePolicy: false,
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				connectSrc: ["'self'", 'https:', 'wss:'],
				scriptSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'https:'],
				objectSrc: ["'none'"],
				frameAncestors: ["'none'"],
				baseUri: ["'self'"]
			}
		},
		hsts: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true
		}
	})
);
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error('Origin nao permitida pelo CORS.'));
		},
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
		credentials: true,
		maxAge: 86400
	})
);
app.use(express.json({ limit: '60kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '60kb' }));
app.use(globalRateLimit);
app.use(blockSuspiciousRequests);
app.use(sanitizeInput);
app.use(requestAuditLogger);

if (canServeFrontend) {
	app.use(express.static(publicPath));
}

app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/external', externalIntegrationRoutes);

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

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	const message = error instanceof Error ? error.message : 'Erro interno inesperado.';

	logSecurityEvent({
		level: 'ERROR',
		event: 'unhandled_error',
		requestId: req.requestId,
		userId: req.authUser?.id || null,
		companyId: req.authUser?.companyId || null,
		ip: req.ip || null,
		method: req.method,
		path: req.originalUrl,
		statusCode: 500,
		details: {
			message
		}
	});

	return res.status(500).json({ message: 'Erro interno do servidor.' });
});

export default app;
