import { Router } from 'express';
import { supabaseAdmin, supabaseAuth } from '../supabaseClient';
import { logSecurityEvent } from '../services/securityLogger';
import {
	createCompanyForSignup,
	ensureUserHasCompany,
	getCompanySubscription,
	isSubscriptionExpired,
	normalizeUserRole
} from '../services/saasService';

const router = Router();

const getErrorMessage = (error: unknown) => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'Erro interno de autenticacao.';
};

const getUserAccessUntil = async (userId: string) => {
	for (const tableName of ['users', 'User']) {
		const response = await supabaseAdmin.from(tableName).select('*').eq('id', userId).single();

		if (!response.error && response.data) {
			const row = response.data as Record<string, unknown>;
			const raw = row.access_until || row.accessUntil;
			return raw ? String(raw) : null;
		}
	}

	return null;
};

const normalizeRole = (roleValue: unknown) => normalizeUserRole(roleValue);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isStrongPassword = (password: string) =>
	password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);

const getRequestIp = (forwardedForHeader: unknown, fallbackIp: string | undefined) =>
	String(forwardedForHeader || '')
		.split(',')[0]
		?.trim() || fallbackIp || null;

router.post('/register', async (req, res) => {
	try {
		const ip = getRequestIp(req.headers['x-forwarded-for'], req.ip);
		const name = String(req.body?.name || '').trim();
		const email = String(req.body?.email || '').trim().toLowerCase();
		const password = String(req.body?.password || '');
		const companyName = String(req.body?.companyName || '').trim();
		const logoUrl = String(req.body?.logoUrl || '').trim() || null;
		const primaryColor = String(req.body?.primaryColor || '').trim() || '#0ea5e9';

		if (!name || !email || !password || !companyName) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_register_invalid_input',
				requestId: req.requestId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 400,
				details: {
					email,
					missingFields: true
				}
			});

			return res.status(400).json({
				message: 'name, email, password e companyName sao obrigatorios.'
			});
		}

		if (!emailPattern.test(email)) {
			return res.status(400).json({ message: 'Email invalido.' });
		}

		if (!isStrongPassword(password)) {
			return res.status(400).json({
				message: 'Senha fraca. Use ao menos 8 caracteres com letra maiuscula, minuscula e numero.'
			});
		}

		if (name.length > 120 || companyName.length > 120) {
			return res.status(400).json({ message: 'Nome e empresa devem ter no maximo 120 caracteres.' });
		}

		const companyCreated = await createCompanyForSignup({
			name: companyName,
			plan: 'BASIC',
			logoUrl,
			primaryColor
		});

		if (companyCreated.error || !companyCreated.data) {
			return res.status(400).json({ message: companyCreated.error?.message || 'Falha ao criar empresa.' });
		}

		const company = companyCreated.data as Record<string, unknown>;
		const companyId = String(company.id || '').trim();

		if (!companyId) {
			return res.status(400).json({ message: 'Empresa criada sem id valido.' });
		}

		const authCreated = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			app_metadata: {
				role: 'CLIENT',
				company_id: companyId
			},
			user_metadata: {
				name,
				role: 'CLIENT',
				company_id: companyId,
				company_name: companyName,
				logo_url: logoUrl,
				primary_color: primaryColor
			}
		});

		if (authCreated.error || !authCreated.data.user) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_register_provider_failure',
				requestId: req.requestId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 400,
				details: {
					email,
					reason: authCreated.error?.message || 'create_user_failed'
				}
			});

			return res.status(400).json({ message: authCreated.error?.message || 'Falha ao criar usuario.' });
		}

		const authUser = authCreated.data.user;
		const ensuredUser = await ensureUserHasCompany({
			authUser,
			fallbackRole: 'CLIENT',
			fallbackCompanyId: companyId,
			fallbackCompanyName: companyName,
			fallbackUserName: name
		});

		if (ensuredUser.error || !ensuredUser.companyId) {
			return res.status(400).json({
				message: ensuredUser.error || 'Falha ao vincular usuario com a empresa criada.'
			});
		}

		const signIn = await supabaseAuth.auth.signInWithPassword({ email, password });

		if (signIn.error || !signIn.data.session) {
			logSecurityEvent({
				event: 'auth_register_success_without_session',
				requestId: req.requestId,
				userId: authUser.id,
				companyId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 201,
				details: {
					email
				}
			});

			return res.status(201).json({
				message: 'Conta criada. Faca login para continuar.',
				companyId,
				redirectTo: '/login'
			});
		}

		logSecurityEvent({
			event: 'auth_register_success',
			requestId: req.requestId,
			userId: authUser.id,
			companyId: ensuredUser.companyId,
			ip,
			method: req.method,
			path: req.originalUrl,
			statusCode: 201,
			details: {
				email,
				role: 'CLIENT'
			}
		});

		return res.status(201).json({
			message: 'Conta criada com sucesso.',
			role: 'CLIENT',
			companyId: ensuredUser.companyId,
			session: signIn.data.session,
			redirectTo: '/dashboard'
		});
	} catch (error) {
		logSecurityEvent({
			level: 'ERROR',
			event: 'auth_register_exception',
			requestId: req.requestId,
			ip: getRequestIp(req.headers['x-forwarded-for'], req.ip),
			method: req.method,
			path: req.originalUrl,
			statusCode: 500,
			details: {
				error: getErrorMessage(error)
			}
		});

		console.error('Auth register failed:', error);
		return res.status(500).json({ message: getErrorMessage(error) });
	}
});

router.post('/logout', async (_req, res) => {
	return res.status(200).json({ message: 'Logout realizado com sucesso.' });
});

router.post('/login', async (req, res) => {
	try {
		const ip = getRequestIp(req.headers['x-forwarded-for'], req.ip);
		const email = String(req.body?.email || '').trim().toLowerCase();
		const password = String(req.body?.password || '');

		if (!email || !password) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_login_invalid_input',
				requestId: req.requestId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 400,
				details: {
					email
				}
			});

			return res.status(400).json({
				message: 'Email e senha sao obrigatorios.'
			});
		}

		if (!emailPattern.test(email)) {
			return res.status(400).json({ message: 'Credenciais em formato invalido.' });
		}

		const { data, error } = await supabaseAuth.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_login_failed',
				requestId: req.requestId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 401,
				details: {
					email,
					reason: error.message
				}
			});

			return res.status(401).json({
				message: error.message
			});
		}

		const accessToken = data.session?.access_token;

		if (!accessToken) {
			return res.status(401).json({ message: 'Sessao invalida.' });
		}

		const { data: userData } = await supabaseAdmin.auth.getUser(accessToken);

		if (!userData.user) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_login_user_not_found',
				requestId: req.requestId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 401,
				details: {
					email
				}
			});

			return res.status(401).json({ message: 'Usuario da sessao nao encontrado.' });
		}

		const ensuredUser = await ensureUserHasCompany({
			authUser: userData.user,
			fallbackRole: userData.user.app_metadata?.role || userData.user.user_metadata?.role,
			fallbackCompanyId:
				String(userData.user.app_metadata?.company_id || userData.user.user_metadata?.company_id || '').trim() ||
				null,
			fallbackCompanyName: String(userData.user.user_metadata?.company_name || '').trim() || null,
			fallbackUserName: String(userData.user.user_metadata?.name || '').trim() || null
		});

		if (ensuredUser.error || (ensuredUser.role === 'CLIENT' && !ensuredUser.companyId)) {
			logSecurityEvent({
				level: 'ERROR',
				event: 'auth_login_user_sync_failed',
				requestId: req.requestId,
				userId: userData.user.id,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 500,
				details: {
					reason: ensuredUser.error || 'missing_company_for_client'
				}
			});

			return res.status(500).json({
				message: ensuredUser.error || 'Nao foi possivel vincular uma empresa ao usuario.'
			});
		}

		const role = normalizeRole(ensuredUser.role || 'CLIENT');
		const companyId = ensuredUser.companyId || null;
		const subscription = companyId ? await getCompanySubscription(companyId) : null;
		const accessUntilFromMetadata = String(
			userData.user.user_metadata?.access_until || userData.user.user_metadata?.accessUntil || ''
		).trim() || null;
		const accessUntilFromTable = await getUserAccessUntil(userData.user.id);
		const accessUntil = accessUntilFromTable || accessUntilFromMetadata;

		if (role === 'CLIENT' && accessUntil && new Date(accessUntil).getTime() < Date.now()) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_login_blocked_expired_user_access',
				requestId: req.requestId,
				userId: userData.user.id,
				companyId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 403
			});

			return res.status(403).json({
				message: 'A validade do seu acesso expirou. Fale com o suporte para reativar sua conta.'
			});
		}

		if (
			role === 'CLIENT' &&
			subscription &&
			isSubscriptionExpired(subscription.status, subscription.expiresAt)
		) {
			logSecurityEvent({
				level: 'WARN',
				event: 'auth_login_blocked_expired_subscription',
				requestId: req.requestId,
				userId: userData.user.id,
				companyId,
				ip,
				method: req.method,
				path: req.originalUrl,
				statusCode: 403
			});

			return res.status(403).json({
				message: 'A assinatura da sua empresa expirou. Fale com o suporte para regularizar o acesso.'
			});
		}

		const redirectTo = role === 'ADMIN' ? '/admin' : '/dashboard';

		logSecurityEvent({
			event: 'auth_login_success',
			requestId: req.requestId,
			userId: userData.user.id,
			companyId,
			ip,
			method: req.method,
			path: req.originalUrl,
			statusCode: 200,
			details: {
				email,
				role
			}
		});

		return res.status(200).json({
			message: 'Login realizado com sucesso.',
			user: data.user,
			session: {
				...data.session,
				role,
				companyId
			},
			role,
			companyId,
			accessUntil,
			subscription: subscription
				? {
					plan: subscription.plan,
					status: subscription.status,
					expiresAt: subscription.expiresAt
				}
				: null,
			redirectTo
		});
	} catch (error) {
		logSecurityEvent({
			level: 'ERROR',
			event: 'auth_login_exception',
			requestId: req.requestId,
			ip: getRequestIp(req.headers['x-forwarded-for'], req.ip),
			method: req.method,
			path: req.originalUrl,
			statusCode: 500,
			details: {
				error: getErrorMessage(error)
			}
		});

		console.error('Auth login failed:', error);
		return res.status(500).json({ message: getErrorMessage(error) });
	}
});

export default router;
