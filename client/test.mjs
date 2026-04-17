import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zhkyiejojztkuxbpektl.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoa3lpZWpvanp0a3V4YnBla3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTc1MjgsImV4cCI6MjA3MDQ5MzUyOH0.qNLTabvTjZBlKZGmWDUP7ozBUYBTW2VWUtHEYaymnv0';

if (!SUPABASE_ANON_KEY) {
    console.error('❌ Missing ANON_KEY');
    process.exit(1);
}

console.log('Testing Realtime Connection on Personal Network...');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// 📡 Create channel
const channel = supabase
  .channel('test-diagnostic-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notification',
    },
    (payload) => {
      console.log('✅ Payload received:', payload);
    }
  )
  .subscribe((status) => {
    console.log('📡 Subscription Status:', status);

    if (status === 'SUBSCRIBED') {
      console.log('🟢 Realtime connected successfully');
    }

    if (status === 'CHANNEL_ERROR') {
      console.log('❌ Channel error → NOT firewall, config issue');
    }

    if (status === 'TIMED_OUT') {
      console.log('⏱️ Timeout → possible network/firewall issue');
    }

    if (status === 'CLOSED') {
      console.log('🔴 Connection closed');
    }

    // Exit after test
    if (
      status === 'SUBSCRIBED' ||
      status === 'CHANNEL_ERROR' ||
      status === 'TIMED_OUT'
    ) {
      setTimeout(() => process.exit(0), 3000);
    }
  });

// 🔍 Extra debug (internal realtime state)
setTimeout(() => {
  console.log('\n🔍 Realtime debug info:');
  console.log('Channels:', supabase.getChannels().length);
}, 2000);