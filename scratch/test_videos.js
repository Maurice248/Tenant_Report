const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://cdssxtquayzijmbnlqmt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkc3N4dHF1YXl6aWptYm5scW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI4MDcsImV4cCI6MjA4MzkxODgwN30.My8tzvRNxUwHfajQ5QyqTrfvHQ0GR2L0P075YkgxuVc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', 1)
      .single();
    
    console.log("Error:", error);
    console.log("Data:", data);
  } catch (err) {
    console.error("Crash:", err);
  }
}

testFetch();
