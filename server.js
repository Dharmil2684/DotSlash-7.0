const fs = require('fs');
const mysql = require('mysql2');

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
    return;
  }
  console.log('Connected to the database');

  // Perform database operations here

  // Close the connection when done
  connection.end((err) => {
    if (err) {
      console.error('Error closing the database connection:', err);
      return;
    }
    console.log('Connection closed');
  });
});
