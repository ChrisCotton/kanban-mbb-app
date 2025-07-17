export default function handler(req, res) {
  if (req.method === 'POST') {
    // You can process the incoming data here if needed
    res.status(200).json({ message: 'Weather data received!' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
} 