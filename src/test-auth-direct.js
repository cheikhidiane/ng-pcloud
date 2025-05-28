// Direct test script for authentication API
const API_URL = 'http://127.0.0.1:8000/api';

// Test login with direct fetch
async function testDirectLogin() {
  console.log('Testing direct login...');
  
  try {
    const response = await fetch(`${API_URL}/account/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Add this to help with CORS
      },
      body: JSON.stringify({
        username: 'test@example.com',
        password: 'password123'
      })
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json().catch(e => {
      console.log('Error parsing JSON:', e);
      return { error: 'Failed to parse response' };
    });
    
    console.log('Response data:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Test with XMLHttpRequest as a fallback
function testXHRLogin() {
  console.log('Testing XHR login...');
  
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_URL}/account/token/`, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      console.log('XHR status:', xhr.status);
      console.log('XHR response:', xhr.responseText);
      
      try {
        const data = JSON.parse(xhr.responseText);
        console.log('XHR parsed data:', data);
      } catch (e) {
        console.log('Error parsing XHR response:', e);
      }
    }
  };
  
  xhr.onerror = function(error) {
    console.error('XHR error:', error);
  };
  
  xhr.send(JSON.stringify({
    username: 'test@example.com',
    password: 'password123'
  }));
}

// Run the tests
console.log('Starting API tests...');
testDirectLogin().then(() => {
  console.log('Direct fetch test completed');
  testXHRLogin();
});
