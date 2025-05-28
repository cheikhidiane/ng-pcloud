// Simple script to test the login API
const testLogin = async () => {
  try {
    console.log('Testing login API...');
    const response = await fetch('http://127.0.0.1:8000/api/account/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test@example.com', // API expects username field instead of email
        password: 'password123'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (data.access) {
      console.log('Login successful! Testing profile endpoint...');
      
      // Test the profile endpoint
      const profileResponse = await fetch('http://127.0.0.1:8000/api/account/profile/', {
        headers: {
          'Authorization': `Bearer ${data.access}`
        }
      });
      
      const profileData = await profileResponse.json();
      console.log('Profile response status:', profileResponse.status);
      console.log('Profile data:', profileData);
    }
  } catch (error) {
    console.error('Error testing login:', error);
  }
};

// Run the test
testLogin();
