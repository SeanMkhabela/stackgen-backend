const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Basic API route
app.get('/api', (req, res) => {
    res.json({ message: "Hello from backend!" });
});

// Example API endpoints
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.post('/api/echo', (req, res) => {
    res.json({
        received: req.body,
        message: "Data received successfully!"
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Express running on port ${PORT}`));