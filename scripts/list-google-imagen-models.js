/**
 * Script to list available Google Imagen models
 * Run with: node scripts/list-google-imagen-models.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.NANO_BANANA_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error('❌ Missing API key');
  console.error('Set NANO_BANANA_API_KEY or GOOGLE_AI_API_KEY in .env.local');
  process.exit(1);
}

async function listModels() {
  console.log('🔍 Listing available Google Generative AI models...\n');
  
  try {
    // Try the Generative AI API endpoint
    const listEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    console.log(`📡 Calling: ${listEndpoint}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...\n`);
    
    const response = await fetch(`${listEndpoint}?key=${apiKey}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, response.statusText);
      console.error('Response:', errorText);
      
      // Try alternative endpoint
      console.log('\n🔄 Trying alternative endpoint...');
      const altResponse = await fetch(`${listEndpoint}`, {
        headers: {
          'x-goog-api-key': apiKey
        }
      });
      
      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.error('❌ Alternative endpoint also failed:', altErrorText);
        process.exit(1);
      }
      
      const altResult = await altResponse.json();
      console.log('✅ Success with alternative endpoint!\n');
      displayModels(altResult);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Success!\n');
    displayModels(result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function displayModels(result) {
  if (!result.models || result.models.length === 0) {
    console.log('⚠️ No models found in response');
    console.log('Full response:', JSON.stringify(result, null, 2));
    return;
  }
  
  console.log(`📋 Found ${result.models.length} models:\n`);
  
  // Filter for Imagen models
  const imagenModels = result.models.filter(m => 
    m.name?.toLowerCase().includes('imagen') || 
    m.displayName?.toLowerCase().includes('imagen')
  );
  
  if (imagenModels.length > 0) {
    console.log('🎨 Imagen Models:');
    imagenModels.forEach(model => {
      console.log(`\n  Name: ${model.name}`);
      console.log(`  Display Name: ${model.displayName || 'N/A'}`);
      console.log(`  Description: ${model.description || 'N/A'}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
      console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
    });
  } else {
    console.log('⚠️ No Imagen models found');
  }
  
  // Show all models for reference
  console.log('\n\n📋 All Available Models:');
  result.models.forEach((model, index) => {
    const isImagen = model.name?.toLowerCase().includes('imagen') || 
                     model.displayName?.toLowerCase().includes('imagen');
    const prefix = isImagen ? '🎨' : '  ';
    console.log(`${prefix} ${index + 1}. ${model.name} (${model.displayName || 'No display name'})`);
    if (model.supportedGenerationMethods) {
      console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
    }
  });
  
  console.log('\n💡 Tip: Look for models with "predict" or "generate" in supportedGenerationMethods');
}

listModels();
