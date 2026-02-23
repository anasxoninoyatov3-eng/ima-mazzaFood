const axios = require('axios');

async function sendTestOrder() {
  try {
    const order = {
      id: 'test_' + Date.now(),
      name: 'Test User',
      phone: '+998901234567',
      address: 'Test Address 123',
      items: {
        item1: { name: 'Burger', qty: 2, price: 25000 },
        item2: { name: 'Fries', qty: 1, price: 15000 }
      },
      total: 65000,
      ts: Date.now()
    };

    console.log('Sending order:', order);
    const response = await axios.post('http://localhost:3000/api/send-order', { order });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Data:', error.response.data);
    }
  }
}

sendTestOrder();
