import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://tdjldzfrhwaxnbmpcaup.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables for authentication client.')
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
