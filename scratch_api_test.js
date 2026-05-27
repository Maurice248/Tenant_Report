// Test 1: Direct Supabase REST API (same as what the new API route does)
const SUPABASE_URL = 'https://cdssxtquayzijmbnlqmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkc3N4dHF1YXl6aWptYm5scW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI4MDcsImV4cCI6MjA4MzkxODgwN30.My8tzvRNxUwHfajQ5QyqTrfvHQ0GR2L0P075YkgxuVc';

async function testDirectRest() {
  console.log('\n--- Testing Supabase REST API directly ---');
  const url = `${SUPABASE_URL}/rest/v1/Error%20Alerts?id=eq.1&select=Error%2Cupdated_at&limit=1`;
  console.log('URL:', url);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testDirectRest();
