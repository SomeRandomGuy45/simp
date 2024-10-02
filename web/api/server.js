const express = require('express');
const app = express();
const express_ws = require('express-ws')(app);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running!')
});

app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});