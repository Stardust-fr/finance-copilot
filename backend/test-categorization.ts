import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testCategorization() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...');
  
  const genAI = new GoogleGenerativeAI(apiKey);

  // Test transaction from the image
  const transaction = {
    merchant: 'WDL TFR UPI/DR/529825323992/Swiggy Ltd/UTIB/swiggy pi@Pa',
    amount: 697.69,
    description: '0097696162090 AT 16169 SECTOR-19 INDIRA NAGAR',
  };

  console.log('\n🔍 Testing Gemini Categorization\n');
  console.log('Transaction Details:');
  console.log(`  Merchant: ${transaction.merchant}`);
  console.log(`  Amount: ₹${transaction.amount}`);
  console.log(`  Description: ${transaction.description}`);
  console.log('\n⏳ Calling Gemini API (gemini-3.8-flash)...\n');

  const prompt = `You are a finance assistant. Categorize this transaction into exactly one of:
FOOD, TRAVEL, SHOPPING, BILLS, HEALTHCARE, ENTERTAINMENT, EDUCATION, INCOME, OTHER.

Transaction: merchant="${transaction.merchant}", amount=${transaction.amount}, description="${transaction.description}"

Respond with valid JSON only, no markdown, no explanation:
{"category": "CATEGORY_NAME", "confidence": 0.95}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    console.log('📤 Raw API Response:');
    console.log(text);
    console.log('');

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { category: string; confidence: number };

    console.log('✅ Categorization Result:');
    console.log(`  Category: ${parsed.category}`);
    console.log(`  Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);
    console.log('\n📊 Analysis:');
    console.log(`  Swiggy is a food delivery service in India.`);
    console.log(`  Expected category: FOOD`);
    console.log(`  Actual category: ${parsed.category}`);
    
    if (parsed.category.toUpperCase() === 'FOOD') {
      console.log('\n✅ Correct categorization!');
    } else {
      console.log('\n⚠️  Unexpected categorization!');
    }
  } catch (error: any) {
    console.error('❌ Error Details:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Type: ${error.constructor.name}`);
    if (error.status) console.error(`  Status: ${error.status}`);
    if (error.statusText) console.error(`  Status Text: ${error.statusText}`);
    console.error('\n📝 Full Error:');
    console.error(error);
  }
}

testCategorization();
