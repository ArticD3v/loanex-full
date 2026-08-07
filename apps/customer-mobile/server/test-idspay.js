require('dotenv').config();

const API_ID = process.env.IDSPAY_API_ID;
const API_KEY = process.env.IDSPAY_API_KEY;
const TOKEN_ID = process.env.IDSPAY_TOKEN_ID;
const PROD_URL = 'https://javabackend.idspay.in/api/v1/prod/srv2/validation/digilocker-digital-kyc';

async function generateDigiLockerUrl(aadhaar) {
  console.log(`\n=================================================`);
  console.log(`Testing with REAL Aadhaar: ${aadhaar}`);
  
  const payload = {
    api_id: API_ID,
    api_key: API_KEY,
    token_id: TOKEN_ID,
    methodName: 'generateToken',
    mobile_number: '9876543210',
    redirectUrl: 'http://localhost', // IDSPay will redirect here after success
    logoUrl: 'http://localhost'
  };

  try {
    const res = await fetch(PROD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.status?.code === 200) {
      console.log(`✅ SUCCESS! DigiLocker URL Generated!`);
      console.log(`\n🔗 CLICK THIS URL TO OPEN DIGILOCKER:`);
      console.log(data.data.url);
      console.log(`\nClient ID (Save this for fetching details later):`);
      console.log(data.data.client_id);
    } else {
      console.log(`❌ FAILED!`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log(`Fetch error:`, err.message);
  }
}

async function fetchDigiLockerDetails(clientId) {
  console.log(`\n=================================================`);
  console.log(`Fetching Details for Client ID: ${clientId}`);
  
  const payload = {
    api_id: API_ID,
    api_key: API_KEY,
    token_id: TOKEN_ID,
    methodName: 'fetchDetails',
    client_id: clientId
  };

  try {
    const res = await fetch(PROD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(`Fetch error:`, err.message);
  }
}

const args = process.argv.slice(2);
if (args[0] === 'fetch' && args[1]) {
  fetchDigiLockerDetails(args[1]);
} else {
  generateDigiLockerUrl("865960280292");
}
