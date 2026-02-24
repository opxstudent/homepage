import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() {
  const { data, error } = await supabase
    .from('calendars')
    .update({ color: '#F97316' })
    .ilike('name', 'workout')
    .select()

  if (error) console.error('Error:', error)
  else console.log('Updated:', data)
  process.exit(0)
}
run()
