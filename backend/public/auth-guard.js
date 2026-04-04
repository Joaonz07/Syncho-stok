const SESSION_KEYS = ['syncho_access_token', 'syncho_role', 'syncho_company_id'];

const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

const getToken = () => localStorage.getItem('syncho_access_token') || '';

const getRole = () => String(localStorage.getItem('syncho_role') || '').toUpperCase();

const logout = async () => {
  const token = getToken();

  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (_error) {
      // Ignore network logout failures and proceed with local cleanup.
    }
  }

  clearSession();
  window.location.href = '/';
};

const validateSession = async (expectedRole) => {
  const token = getToken();

  if (!token) {
    logout();
    return null;
  }

  try {
    const response = await fetch('/api/dashboard/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const payload = await response.json();
    const sessionRole = String(payload?.user?.role || getRole() || 'CLIENT').toUpperCase();

    localStorage.setItem('syncho_role', sessionRole);

    if (payload?.user?.companyId) {
      localStorage.setItem('syncho_company_id', payload.user.companyId);
    }

    if (expectedRole === 'ADMIN' && sessionRole !== 'ADMIN') {
      window.location.href = '/dashboard';
      return null;
    }

    if (expectedRole === 'CLIENT' && sessionRole === 'ADMIN') {
      window.location.href = '/admin';
      return null;
    }

    return {
      token,
      role: sessionRole,
      user: payload.user
    };
  } catch (_error) {
    logout();
    return null;
  }
};

window.AuthGuard = {
  getToken,
  getRole,
  clearSession,
  logout,
  validateSession
};
