
const supabaseUrl = 'https://pioebchtpmxiariezdkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpb2ViY2h0cG14aWFyaWV6ZGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkyNTg4NCwiZXhwIjoyMDg3NTAxODg0fQ.EukInQtthqSq7g8ZWs0tuDgHqqOB-5iGu0GneYRgXhc';

async function checkAccounts() {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/instagram_accounts?select=id,ig_username,page_id,page_access_token`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            console.error('Error fetching accounts:', await response.text());
            return;
        }

        const data = await response.json();
        console.log('--- Connected Accounts Status ---');
        data.forEach(acc => {
            console.log(`Account: ${acc.ig_username}`);
            console.log(`Page ID: ${acc.page_id || 'MISSING'}`);
            console.log(`Page Token: ${acc.page_access_token ? 'PRESENT (' + acc.page_access_token.substring(0, 15) + '...)' : 'MISSING'}`);
            console.log('-------------------------');
        });
    } catch (err) {
        console.error('Script error:', err);
    }
}

checkAccounts();
