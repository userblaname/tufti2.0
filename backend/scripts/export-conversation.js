require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const userId = 'ed008933-74a5-43ac-b128-7b0121413d0f';

(async () => {
  let allMessages = [];
  let offset = 0;
  const batchSize = 500;

  console.log('Starting export...');

  while (true) {
    console.log('Fetching batch at offset ' + offset + '...');
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, text, created_at, conversation_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) { console.error('Error:', error.message); break; }
    if (!data || data.length === 0) { console.log('Done fetching.'); break; }

    allMessages.push(...data);
    console.log('  Got ' + data.length + ' -> Total: ' + allMessages.length);
    offset += batchSize;
    if (data.length < batchSize) break;
  }

  console.log('Total messages: ' + allMessages.length);
  console.log('Building document...');

  let doc = '# Tufti Conversation Export\n';
  doc += '# Total Messages: ' + allMessages.length + '\n';
  doc += '# Exported: ' + new Date().toISOString() + '\n\n';

  let currentDate = '';
  for (const msg of allMessages) {
    const dt = new Date(msg.created_at);
    const dateStr = dt.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = dt.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    if (dateStr !== currentDate) {
      currentDate = dateStr;
      doc += '\n---\n## ' + dateStr + '\n---\n\n';
    }

    const roleLabel = msg.role === 'user' ? 'YOU' : (msg.role === 'assistant' || msg.role === 'tufti') ? 'TUFTI' : 'SYSTEM';

    let content = msg.text || '[empty]';

    doc += '[' + timeStr + '] ' + roleLabel + ':\n' + content + '\n\n';
  }

  const outputPath = '/Users/nobody1/Downloads/tufti_full_conversation_export.md';
  fs.writeFileSync(outputPath, doc, 'utf8');
  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log('Exported to: ' + outputPath);
  console.log('File size: ' + sizeMB + ' MB');
})();
