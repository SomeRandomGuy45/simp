const express = require('express');
const expressWs = require('express-ws');
const SwaggerClient = require('swagger-client');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./api.json'); // Adjust the path as needed

const app = express();
expressWs(app);

app.use(express.json());

// Serve the Swagger API documentation
app.use('/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send('Server is running!');
});

app.post('/', (req, res) => {
    res.send('Posting on / is not allowed!');
});

// Example route using Swagger Client
app.get('/api/example', async (req, res) => {
    try {
        const client = await SwaggerClient('http://localhost:3000/swagger.json'); // Replace with your API URL
        const response = await client.apis.Example.getExample(); // Replace with the actual endpoint
        res.json(response.body);
    } catch (error) {
        console.error('Error fetching example:', error);
        res.status(500).send('Error fetching data');
    }
});

app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});