const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envText = "";
try {
  envText = fs.readFileSync('.env', 'utf8');
} catch (e) {
  try {
    envText = fs.readFileSync('.env.local', 'utf8');
  } catch (err) {}
}

const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdssxtguayzijmbnlqmt.supabase.co';
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log("\n--- Full row from 'Error Alerts' table ---");
  const res = await supabase
    .from("Error Alerts")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  console.log("Full result:", JSON.stringify(res, null, 2));
  
  if (res.data) {
    console.log("\n--- Column values ---");
    console.log("Error column:      ", JSON.stringify(res.data.Error));
    console.log("updated_at column: ", JSON.stringify(res.data.updated_at));
    console.log("created_at column: ", JSON.stringify(res.data.created_at));
    console.log("\n--- All keys in row ---");
    console.log(Object.keys(res.data));
  }
}

testQuery();
