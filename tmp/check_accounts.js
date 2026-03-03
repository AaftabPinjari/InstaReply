
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccounts() {
    const { data, error } = await supabase
        .from('instagram_accounts')
        .select('id, ig_username, page_id, page_access_token');

    if (error) {
        console.error('Error fetching accounts:', error);
        return;
    }

    console.log('--- Connected Accounts ---');
    data.forEach(acc => {
        console.log(`Account: ${acc.ig_username}`);
        console.log(`Page ID: ${acc.page_id || 'MISSING'}`);
        console.log(`Page Token: ${acc.page_access_token ? 'PRESENT (starts with ' + acc.page_access_token.substring(0, 10) + '...)' : 'MISSING'}`);
        console.log('-------------------------');
    });
}

checkAccounts();
