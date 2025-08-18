/**
 * Manual test script for verifying the complete vote flow
 * Run this with a local server and chaincode instance
 */

import { VoteService } from '@/services/VoteService';
import { Fire, Submission } from '@/types/fire';

// Test configuration
const API_BASE = 'http://localhost:4000';
const TEST_FIRE_SLUG = 'test-fire-vote';
const TEST_SUBMISSION_ID = 1;

// Mock MetaMask client for testing
const mockMetamaskClient = {
  signVote: async (voteDto: any) => {
    console.log('🔐 Signing vote DTO:', JSON.stringify(voteDto, null, 2));
    
    // Simulate user signature
    return {
      ...voteDto,
      signature: `0x${Array(130).fill('a').join('')}` // Mock signature
    };
  }
};

async function testFireVote() {
  console.log('\n=== Testing Fire Vote ===\n');
  
  const voteService = new VoteService(API_BASE, mockMetamaskClient);
  
  try {
    // Test 1: Vote on a fire
    console.log('1️⃣ Voting on fire:', TEST_FIRE_SLUG);
    const result = await voteService.voteOnFire(TEST_FIRE_SLUG, 5);
    
    if (result.success) {
      console.log('✅ Fire vote successful:', result.message);
    } else {
      console.log('❌ Fire vote failed:', result.error);
    }
    
    // Test 2: Invalid fire slug
    console.log('\n2️⃣ Testing invalid fire slug');
    const invalidResult = await voteService.voteOnFire('nonexistent-fire', 1);
    console.log('Expected failure:', !invalidResult.success ? '✅' : '❌');
    if (!invalidResult.success) {
      console.log('Error message:', invalidResult.error);
    }
    
  } catch (error) {
    console.error('🔥 Unexpected error:', error);
  }
}

async function testSubmissionVote() {
  console.log('\n=== Testing Submission Vote ===\n');
  
  const voteService = new VoteService(API_BASE, mockMetamaskClient);
  
  try {
    // Test 1: Vote on a submission
    console.log('1️⃣ Voting on submission ID:', TEST_SUBMISSION_ID);
    const result = await voteService.voteOnSubmission(TEST_SUBMISSION_ID, 3);
    
    if (result.success) {
      console.log('✅ Submission vote successful:', result.message);
    } else {
      console.log('❌ Submission vote failed:', result.error);
    }
    
    // Test 2: Invalid submission ID
    console.log('\n2️⃣ Testing invalid submission ID');
    const invalidResult = await voteService.voteOnSubmission(99999, 1);
    console.log('Expected failure:', !invalidResult.success ? '✅' : '❌');
    if (!invalidResult.success) {
      console.log('Error message:', invalidResult.error);
    }
    
  } catch (error) {
    console.error('🔥 Unexpected error:', error);
  }
}

async function verifyChainKeyEndpoints() {
  console.log('\n=== Verifying Chain Key Endpoints ===\n');
  
  try {
    // Test fire chain key endpoint
    console.log('1️⃣ Fetching fire chain key');
    const fireResponse = await fetch(`${API_BASE}/api/fires/${TEST_FIRE_SLUG}/chain-key`);
    if (fireResponse.ok) {
      const fireData = await fireResponse.json();
      console.log('✅ Fire chain key data:', JSON.stringify(fireData, null, 2));
      
      // Verify format
      const expectedFormat = /^\\x00RWBF\\x00.+\\x00$/;
      console.log('Chain key format valid:', expectedFormat.test(fireData.chainKey) ? '✅' : '❌');
    } else {
      console.log('❌ Failed to fetch fire chain key');
    }
    
    // Test submission chain key endpoint
    console.log('\n2️⃣ Fetching submission chain key');
    const subResponse = await fetch(`${API_BASE}/api/submissions/${TEST_SUBMISSION_ID}/chain-key`);
    if (subResponse.ok) {
      const subData = await subResponse.json();
      console.log('✅ Submission chain key data:', JSON.stringify(subData, null, 2));
      
      // Verify format
      const expectedFormat = /^\\x00RWBS\\x00.+\\x00$/;
      console.log('Chain key format valid:', expectedFormat.test(subData.chainKey) ? '✅' : '❌');
      console.log('Has parent info:', subData.hasOwnProperty('isTopLevel') ? '✅' : '❌');
    } else {
      console.log('❌ Failed to fetch submission chain key');
    }
    
  } catch (error) {
    console.error('🔥 Endpoint verification error:', error);
  }
}

async function testVoteValidation() {
  console.log('\n=== Testing Vote Validation ===\n');
  
  // Test various validation scenarios
  const testCases = [
    {
      name: 'Valid fire vote',
      request: {
        target: { type: 'fire' as const, slug: 'test-fire' },
        quantity: 10,
        userAddress: '0x123'
      },
      expectedValid: true
    },
    {
      name: 'Zero quantity',
      request: {
        target: { type: 'fire' as const, slug: 'test-fire' },
        quantity: 0,
        userAddress: '0x123'
      },
      expectedValid: false
    },
    {
      name: 'Missing user address',
      request: {
        target: { type: 'fire' as const, slug: 'test-fire' },
        quantity: 10,
        userAddress: ''
      },
      expectedValid: false
    },
    {
      name: 'Missing fire slug',
      request: {
        target: { type: 'fire' as const, slug: '' },
        quantity: 10,
        userAddress: '0x123'
      },
      expectedValid: false
    }
  ];
  
  for (const testCase of testCases) {
    const error = VoteService.validateVoteRequest(testCase.request);
    const isValid = error === null;
    const passed = isValid === testCase.expectedValid;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Vote System End-to-End Tests\n');
  console.log('Prerequisites:');
  console.log('- Server running on port 4000');
  console.log('- Test fire exists with slug:', TEST_FIRE_SLUG);
  console.log('- Test submission exists with ID:', TEST_SUBMISSION_ID);
  console.log('\n');
  
  await verifyChainKeyEndpoints();
  await testVoteValidation();
  await testFireVote();
  await testSubmissionVote();
  
  console.log('\n✨ All tests completed!\n');
}

// Export for use in other test files
export {
  testFireVote,
  testSubmissionVote,
  verifyChainKeyEndpoints,
  testVoteValidation,
  runAllTests
};

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}