#!/usr/bin/env node

/**
 * Integration test to verify server returns chainKey fields in responses
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function testServerResponses() {
  console.log('🧪 Testing server API responses for chainKey fields...\n');

  try {
    // Test 1: Get all fires (should include chainKey)
    console.log('1. Testing GET /api/fires for chainKey fields...');
    const firesResponse = await fetch(`${API_BASE}/api/fires`);
    
    if (!firesResponse.ok) {
      console.log('   ❌ Failed to fetch fires:', firesResponse.status);
      return;
    }
    
    const fires = await firesResponse.json();
    if (Array.isArray(fires) && fires.length > 0) {
      const hasChainKey = fires.some(fire => fire.chainKey || fire.chain_key);
      console.log(`   ${hasChainKey ? '✅' : '❌'} Fires response includes chainKey: ${hasChainKey}`);
      if (fires.length > 0) {
        console.log(`      Sample fire keys:`, Object.keys(fires[0]));
      }
    } else {
      console.log('   ℹ️  No fires found, cannot test chainKey field');
    }

    // Test 2: Get submissions for a fire (should include chainKey)
    if (Array.isArray(fires) && fires.length > 0) {
      const testFireSlug = fires[0].slug;
      console.log(`\n2. Testing GET /api/fires/${testFireSlug}/submissions for chainKey fields...`);
      
      const submissionsResponse = await fetch(`${API_BASE}/api/fires/${testFireSlug}/submissions`);
      
      if (!submissionsResponse.ok) {
        console.log('   ❌ Failed to fetch submissions:', submissionsResponse.status);
        return;
      }
      
      const submissions = await submissionsResponse.json();
      if (Array.isArray(submissions) && submissions.length > 0) {
        const hasChainKey = submissions.some(sub => sub.chainKey || sub.chain_key);
        console.log(`   ${hasChainKey ? '✅' : '❌'} Submissions response includes chainKey: ${hasChainKey}`);
        if (submissions.length > 0) {
          console.log(`      Sample submission keys:`, Object.keys(submissions[0]));
        }
      } else {
        console.log('   ℹ️  No submissions found, cannot test chainKey field');
      }
    }

    console.log('\n🎉 Integration test completed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on', API_BASE);
      console.log('   Start server with: cd server && npm run dev');
    }
  }
}

testServerResponses();