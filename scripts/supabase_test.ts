import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Configuration ---
// IMPORTANT: Replace with your actual Supabase URL and ANON key (or SERVICE_ROLE key for testing)
// It's best practice to load these from environment variables
const SUPABASE_URL = 'https://bwrjrfviaqrkdkcpyorx.supabase.co'; // Replace or load from env
// const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cmpyZnZpYXFya2RrY3B5b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTc2NzgsImV4cCI6MjA2MTA3MzY3OH0.ieg8DpR3v-_Nq8UqtbmpS1LueJ3q_UEuSGeeSG500cM'; // ANON KEY - Keep for reference if needed
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cmpyZnZpYXFya2RrY3B5b3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ5NzY3OCwiZXhwIjoyMDYxMDczNjc4fQ.64zK9FlI9qjPfnScuSKLhZQRDgG21ooLgp4I5e0IV6w'; // SERVICE ROLE KEY

// Create Supabase client
// Use { auth: { persistSession: false } } for scripts/server-side use to avoid session persistence warnings
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
  },
});

// --- Core Functions ---

// NOTE: These functions assume RLS is either bypassed (service key)
// or a user is authenticated whose UID matches the userId passed.

// Function to ensure a user exists (or create one for testing)
// IMPORTANT: In a real app, user creation is tied to auth sign-up.
// This is simplified for testing storage logic. RLS for users table
// might prevent insertion with anon key. Service key needed or manual user creation.
async function ensureTestUser(userId: string): Promise<{ id: string; created_at: string } | null> {
  console.log(`Checking for test user: ${userId}`);
  let { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116: Row not found
    console.error('Error checking for user:', selectError.message);
    // If using anon key, this might fail due to RLS (Users can view own user record)
    console.warn('If using anon key, RLS might prevent selecting user. Consider using service_role key for this test script.');
    // Try inserting anyway if not found, might fail with RLS
  }

  if (existingUser) {
    console.log('Test user already exists.');
    return existingUser;
  }

  console.log('Test user not found, attempting to create...');
  // This insert WILL likely fail with the 'anon' key due to RLS on the users table.
  // Use the service_role key or manually create the user in Supabase UI first.
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ id: userId }) // Attempting to insert with specific UUID
    .select()
    .single();

  if (insertError) {
    console.error('Error creating test user:', insertError.message);
    console.warn('This likely failed due to RLS policies. Use the service_role key or create the user manually via the Supabase dashboard.');
    return null;
  }

  console.log('Test user created successfully:', newUser);
  return newUser;
}


// 1. Create a new conversation
async function createConversation(userId: string, title?: string): Promise<{ id: string; user_id: string; title: string | null; created_at: string } | null> {
  console.log(`\nCreating conversation for user ${userId}...`);
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: title || null })
    .select()
    .single(); // Use single() if you expect only one row back

  if (error) {
    console.error('Error creating conversation:', error.message);
    return null;
  }
  console.log('Conversation created:', data);
  return data;
}

// 2. Add a message to a conversation
async function addMessage(conversationId: string, userId: string, sender: 'user' | 'ai', content: string): Promise<void> {
  console.log(`\nAdding message to conversation ${conversationId}...`);
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId, // RLS policy checks this matches the conversation owner
      sender: sender,
      content: content,
    });

  if (error) {
    console.error('Error adding message:', error.message);
  } else {
    console.log(`Message added: [${sender}] ${content}`);
  }
}

// 3. Retrieve conversation history
async function getConversationHistory(conversationId: string): Promise<any[] | null> {
  console.log(`\nRetrieving history for conversation ${conversationId}...`);
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error retrieving conversation history:', error.message);
    return null;
  }
  console.log('Conversation history retrieved:', data);
  return data;
}

// 4. List user conversations
async function listUserConversations(userId: string): Promise<any[] | null> {
  console.log(`\nListing conversations for user ${userId}...`);
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing user conversations:', error.message);
    return null;
  }
  console.log('User conversations retrieved:', data);
  return data;
}


// --- Test Execution ---
async function runTests() {
  console.log('Starting Supabase interaction test...\n');

  // IMPORTANT: Replace with a valid UUID for testing.
  // If using RLS with anon key, this user MUST exist first (create manually in Supabase UI).
  // If using service key, ensureTestUser *might* be able to create it.
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Example UUID

  // Ensure user exists (may require service key or manual creation)
  const user = await ensureTestUser(TEST_USER_ID);
  if (!user) {
      console.error(`\nFailed to ensure test user ${TEST_USER_ID} exists. Aborting tests. See warnings above.`);
      return;
  }

  // Create a conversation
  const conversation = await createConversation(TEST_USER_ID, 'Test Conversation');
  if (!conversation) {
      console.error('\nFailed to create conversation. Aborting further tests.');
      return;
  }
  const conversationId = conversation.id;

  // Add messages
  await addMessage(conversationId, TEST_USER_ID, 'user', 'Hello Tufti AI!');
  await addMessage(conversationId, TEST_USER_ID, 'ai', 'Hello User! How can I help you today?');
  await addMessage(conversationId, TEST_USER_ID, 'user', 'Tell me about reality transurfing.');

  // Retrieve history
  await getConversationHistory(conversationId);

  // List conversations for the user
  await listUserConversations(TEST_USER_ID);

  console.log('\nSupabase interaction test finished.');
}

runTests().catch(console.error); 