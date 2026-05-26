import Groq from 'groq-sdk';

async function main(){
  const key = process.env.GROQ_API_KEY;
  console.log('GROQ_API_KEY present:', !!key);
  if(!key){
    console.error('No GROQ_API_KEY set in environment.');
    process.exit(1);
  }
  const client = new Groq({ apiKey: key });
  try{
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: 'hello, can you hear me?' }
      ],
      max_tokens: 64,
      temperature: 0.2,
    });
    console.log('Groq test response:', JSON.stringify(response?.choices?.[0] ?? response, null, 2));
  }catch(e){
    console.error('Groq test error:', e?.message ?? e);
    process.exit(2);
  }
}

main();
