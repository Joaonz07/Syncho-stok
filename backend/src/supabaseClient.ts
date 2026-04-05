import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://tdjldzfrhwaxnbmpcaup.supabase.co'
const supabaseServiceKey =
	process.env.SUPABASE_SERVICE_KEY ||
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	''
const supabaseAnonKey =
	process.env.SUPABASE_ANON_KEY ||
	process.env.SUPABASE_KEY ||
	process.env.SUPABASE_PUBLIC_KEY ||
	supabaseServiceKey ||
	''

if (!supabaseUrl || !supabaseAnonKey) {
	const missing: string[] = []
	if (!supabaseUrl) missing.push('SUPABASE_URL')
	if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY (ou SUPABASE_KEY/SUPABASE_PUBLIC_KEY/SUPABASE_SERVICE_ROLE_KEY)')

	throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`)
}

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
})

export const supabaseAdmin = createClient(
	supabaseUrl,
	supabaseServiceKey || supabaseAnonKey,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	}
)

export const supabase = supabaseAdmin
