const fs = require('fs')
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

// Connection details
const connection = mysql.createConnection({
  host: 'quandale-dingle-warranty-predictor-warranty-prediction.a.aivencloud.com',
  port: 16942,
  user: 'avnadmin',
  password: 'AVNS_NYRB2lUvSBvTE349hkA',
  database: 'defaultdb',
  ssl: {
    ca: fs.readFileSync('ca.pem'),
    rejectUnauthorized: true
  }
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Define a route to render the form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Define a route to handle form submission and insert data into the ProductTestingLog table
app.post('/add-to-testing-log', (req, res) => {
  const { productId, modelId, testingStartDate, failureDate, maintenanceCost } = req.body;
  const insertQuery = 'INSERT INTO ProductTestingLog (ProductID, ModelID, TestingStartDate, FailureDate, MaintenanceCost) VALUES (?, ?, ?, ?, ?)';
  const values = [productId, modelId, testingStartDate, failureDate, maintenanceCost];

  connection.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into ProductTestingLog:', err);
      res.status(500).json({ message: 'Error inserting data into ProductTestingLog' });
    } else {
      console.log('Data inserted into ProductTestingLog:', result);
      res.json({ message: 'Data inserted into ProductTestingLog successfully' });
    }
  });
});

app.post('/add-to-models', (req, res) => {
  const { modelName } = req.body;
  const insertQuery = 'INSERT INTO Models (ModelName) VALUES (?)';
  const values = [modelName];

  connection.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into Models:', err);
      res.status(500).json({ message: 'Error inserting data into Models' });
    } else {
      console.log('Data inserted into Models:', result);
      res.json({ message: 'Data inserted into Models successfully' });
    }
  });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
