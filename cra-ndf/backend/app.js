const express = require('express');
const cors = require('cors');
const helloRoutes = require('./routes/helloRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/hello', helloRoutes);

module.exports = app;