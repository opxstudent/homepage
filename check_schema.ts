
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('quick_links').select('*').limit(1);
  if (error) console.error(error);
  else if (data && data.length > 0) console.log(Object.keys(data[0]));
  else console.log('Table is empty, schema unknown from data.');
}
checkSchema();

