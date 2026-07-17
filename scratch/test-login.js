const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vqujwsnikoqpawbbcntm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdWp3c25pa29xcGF3YmJjbnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzk0NjksImV4cCI6MjA5OTQxNTQ2OX0.OQfRdSxz8sPKa7chxKENqgTDX2CGs4Gw3NLHGgIZBsU'
);

async function testLogin() {
  console.log("Attempting sign in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'aimlhod@mits.ac.in',
    password: 'HOD@CSM'
  });

  if (authErr) {
    console.error("Sign in failed:", authErr.message);
    return;
  }

  console.log("Sign in successful. User ID:", authData.user.id);

  console.log("Fetching profile from public.users...");
  const { data: profile, error: profErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profErr) {
    console.error("Failed to fetch profile:", profErr.message);
  } else {
    console.log("Profile successfully retrieved:", JSON.stringify(profile, null, 2));
  }
}

testLogin();
