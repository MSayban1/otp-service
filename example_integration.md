# EmailJS Personal Integration Example

This service is designed to be easily integrated into any client-side website. Below is a complete example of how to use the API to send and verify OTPs.

## 1. Send OTP Example

```javascript
async function sendOTP() {
    const response = await fetch('http://localhost:3000/api/send-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'YOUR_API_KEY_HERE'
        },
        body: JSON.stringify({
            email: 'recipient@example.com',
            templateId: 'welcome_otp', // The ID you set in the dashboard
            templateData: {
                USERNAME: 'John Doe',
                APP_NAME: 'My Awesome App'
            }
        })
    });

    const data = await response.json();
    if (response.ok) {
        console.log('OTP sent successfully:', data.message);
    } else {
        console.error('Error sending OTP:', data.error);
    }
}
```

## 2. Verify OTP Example

```javascript
async function verifyOTP(userCode) {
    const response = await fetch('http://localhost:3000/api/verify-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'YOUR_API_KEY_HERE'
        },
        body: JSON.stringify({
            email: 'recipient@example.com',
            code: userCode // 6-digit code entered by user
        })
    });

    const data = await response.json();
    if (response.ok) {
        alert('OTP verified successfully!');
    } else {
        alert('Verification failed: ' + data.error);
    }
}
```

## 3. Creating a Template in Dashboard

1. Open http://localhost:3000 in your browser.
2. Go to **Email Templates**.
3. Click **Create Template**.
4. Use placeholders like `{{OTP}}`, `{{USERNAME}}`, etc.
5. In your API call, pass these values inside `templateData`.

> [!NOTE]
> The `{{OTP}}` placeholder is automatically filled by the service. You don't need to generate it yourself!
