import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://jyogcehpqqfjxwbwzvqq.supabase.co'
const supabaseKey = 'sb_publishable_NU-9jcwi4L46lssxshFy1w_zbV29xf8'

export const supabase = createClient(supabaseUrl, supabaseKey)
