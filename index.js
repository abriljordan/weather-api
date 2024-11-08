// index.js
const express = require('express');
const axios = require('axios');
const redis = require('redis');

// Set up Redis client
const redisClient = redis.createClient();
redisClient.connect().catch(err => console.error('Redis connection error:', err));

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHERMAP_API_KEY; // Use environment variable for API key

// Middleware to parse JSON
app.use(express.json());
app.use(express.static('public'));

// Endpoint to fetch weather data for a city
app.get('/weather', async (req, res) => {
    const city = req.query.city;
    if (!city || typeof city !== 'string' || city.length === 0) {
        return res.status(400).json({ error: 'Valid city name is required' });
    }

    try {
        // Check Redis for cached data
        const cachedData = await redisClient.get(city);
        if (cachedData) {
            console.log('Returning cached data');
            return res.status(200).json(JSON.parse(cachedData)); // Explicitly setting status code
        }

        // If no cache, fetch data from OpenWeatherMap API
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
        const response = await axios.get(url);
        const weatherData = response.data;

        // Cache the data in Redis for 1 hour (3600 seconds)
        await redisClient.setEx(city, 3600, JSON.stringify(weatherData));

        res.status(200).json(weatherData); // Explicitly setting status code
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: 'Unable to fetch weather data' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});