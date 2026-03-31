require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Your user ID — excluded from export
const EXCLUDED_USER_ID = 'ed008933-74a5-43ac-b128-7b0121413d0f';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'exports', 'other-users');

(async () => {
  console.log('=== Export All Other Users ===');
  console.log('Excluding user:', EXCLUDED_USER_ID);
  console.log('');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Step 1: Fetch ALL messages from all users except excluded
  let allMessages = [];
  let offset = 0;
  const batchSize = 500;

  console.log('Fetching all messages (excluding your user)...');

  while (true) {
    console.log('  Batch at offset ' + offset + '...');
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, text, created_at, conversation_id, user_id')
      .neq('user_id', EXCLUDED_USER_ID)
      .order('created_at', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) { console.error('Error:', error.message); break; }
    if (!data || data.length === 0) { console.log('  Done fetching.'); break; }

    allMessages.push(...data);
    console.log('  Got ' + data.length + ' -> Total: ' + allMessages.length);
    offset += batchSize;
    if (data.length < batchSize) break;
  }

  if (allMessages.length === 0) {
    console.log('\nNo messages found for other users.');
    return;
  }

  console.log('\nTotal messages fetched: ' + allMessages.length);

  // Step 2: Group messages by user_id, then by conversation_id
  const userMap = {};

  for (const msg of allMessages) {
    const uid = msg.user_id;
    if (!userMap[uid]) userMap[uid] = {};

    const convId = msg.conversation_id || 'no-conversation';
    if (!userMap[uid][convId]) userMap[uid][convId] = [];

    userMap[uid][convId].push(msg);
  }

  const userIds = Object.keys(userMap);
  const dateStr = new Date().toISOString().split('T')[0]; // e.g. 2026-03-22

  let totalConversations = 0;
  let totalMessagesExported = 0;

  console.log('\nBuilding export files...');

  // Step 3: Export each user to a separate .md file
  for (const uid of userIds) {
    const conversations = userMap[uid];
    const convIds = Object.keys(conversations);
    const shortId = uid.substring(0, 8);

    let doc = '# Conversation Export\n';
    doc += '# User ID: ' + uid + '\n';
    doc += '# Conversations: ' + convIds.length + '\n';

    let userMsgCount = 0;
    for (const convId of convIds) {
      userMsgCount += conversations[convId].length;
    }

    doc += '# Total Messages: ' + userMsgCount + '\n';
    doc += '# Exported: ' + new Date().toISOString() + '\n\n';

    for (const convId of convIds) {
      const msgs = conversations[convId];
      totalConversations++;

      doc += '\n===================================\n';
      doc += '## Conversation: ' + convId + '\n';
      doc += '## Messages: ' + msgs.length + '\n';
      doc += '===================================\n\n';

      let currentDate = '';
      for (const msg of msgs) {
        const dt = new Date(msg.created_at);
        const dateLine = dt.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const timeStr = dt.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: true
        });

        if (dateLine !== currentDate) {
          currentDate = dateLine;
          doc += '\n---\n## ' + dateLine + '\n---\n\n';
        }

        const roleLabel = msg.role === 'user' ? 'USER'
          : (msg.role === 'assistant' || msg.role === 'tufti') ? 'TUFTI'
          : 'SYSTEM';

        let content = msg.text || '[empty]';

        doc += '[' + timeStr + '] ' + roleLabel + ':\n' + content + '\n\n';
        totalMessagesExported++;
      }
    }

    // Write file
    const fileName = 'export_' + shortId + '_' + dateStr + '.md';
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, doc, 'utf8');

    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log('  ✅ ' + fileName + ' (' + sizeMB + ' MB, ' + userMsgCount + ' msgs, ' + convIds.length + ' convs)');
  }

  // Step 4: Print summary
  console.log('\n========== EXPORT SUMMARY ==========');
  console.log('Total users exported:         ' + userIds.length);
  console.log('Total conversations exported: ' + totalConversations);
  console.log('Total messages exported:       ' + totalMessagesExported);
  console.log('Output directory:             ' + OUTPUT_DIR);
  console.log('====================================');
})();
