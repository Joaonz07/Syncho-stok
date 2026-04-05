import { supabaseAdmin } from '../supabaseClient';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@syncho.cloud';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'syncho89@';

const getAllAuthUsers = async () => {
  const users = [] as Array<{ id: string; email?: string | null; app_metadata?: Record<string, unknown> }>;
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const pageUsers = data.users || [];
    users.push(...pageUsers);

    if (pageUsers.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
};

export const ensureAdminUser = async () => {
  const users = await getAllAuthUsers();
  const existingAdmin = users.find((user) => (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (existingAdmin) {
    await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
      password: ADMIN_PASSWORD,
      app_metadata: {
        ...(existingAdmin.app_metadata || {}),
        role: 'ADMIN'
      }
    });
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: {
      role: 'ADMIN'
    },
    user_metadata: {
      role: 'ADMIN'
    }
  });

  if (error) {
    throw error;
  }

  console.log(`Admin user created: ${ADMIN_EMAIL}`);
};
