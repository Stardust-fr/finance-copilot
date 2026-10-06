import { MockAIService } from './src/services/ai/MockAIService';

async function testMockCategorization() {
  const mockService = new MockAIService();

  // Test transaction from the image
  const transaction = {
    merchant: 'WDL TFR UPI/DR/529825323992/Swiggy Ltd/UTIB/swiggy pi@Pa',
    amount: 697.69,
    description: '0097696162090 AT 16169 SECTOR-19 INDIRA NAGAR',
  };

  console.log('🔍 Testing Mock AI Categorization\n');
  console.log('Transaction Details:');
  console.log(`  Merchant: ${transaction.merchant}`);
  console.log(`  Amount: ₹${transaction.amount}`);
  console.log(`  Description: ${transaction.description}`);
  console.log('\n⏳ Using Mock AI Service (keyword-based)...\n');

  const result = await mockService.categorizeTransaction(transaction);
  
  console.log('✅ Mock Categorization Result:');
  console.log(`  Category: ${result.category}`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log('\n📊 Analysis:');
  console.log(`  The mock service checks for keywords in merchant/description:`);
  console.log(`  - "swiggy" (case-insensitive) → FOOD`);
  console.log(`  - "zomato" → FOOD`);
  console.log(`  - "uber" → TRAVEL`);
  console.log(`  - etc.`);
  console.log(`\n  Actual category: ${result.category}`);
  
  if (result.category === 'FOOD') {
    console.log('\n✅ Correct categorization!');
  } else {
    console.log('\n⚠️  Unexpected categorization!');
  }
}

testMockCategorization();
