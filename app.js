const fs = require('fs')
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();

// Serve static files (including CSS)
app.use(express.static(__dirname));

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Define a route to render the form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + 'login.html'));
});



app.use(bodyParser.json());

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

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

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/get-initial-models', (req, res) => {
  const query = 'SELECT ModelName FROM Models';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching initial Model Names:', err);
      res.status(500).json({ message: 'Error fetching initial Model Names' });
    } else {
      const modelNames = results.map(result => result.ModelName);
      res.json({ modelNames });
    }
  });
});

app.post('/signup', (req, res) => {
  const { username, email, pass } = req.body;
  const insertQuery = 'INSERT INTO users (username, email, pass) VALUES (?, ?, ?)';
  connection.query(insertQuery, [username, email, pass], (err, result) => {
    if (err) {
      console.error('Error signing up user:', err);
      console.log('User signup failed');
      return res.status(500).send('Error signing up user');
    } else {
      console.log('User signed up successfully');
      console.log('User signup successful');
      return res.status(200).send('User signed up successfully');
    }
  });
});

// Handle user login
app.post('/login', (req, res) => {
  const { email, pass } = req.body;

  if (!email || !pass) {
    console.error('Email and password are required');
    return res.status(400).send('Email and password are required');
  }

  const selectQuery = 'SELECT * FROM users WHERE email = ?';
  connection.query(selectQuery, [email], (err, result) => {
    if (err) {
      console.error('Error logging in user:', err);
      return res.status(500).send('Error logging in user');
    }

    if (result.length === 0) {
      console.error('User not found');
      return res.status(404).send('User not found');
    }

    const user = result[0];

    // Assuming 'pass' is the name of the field in the database for the password
    if (pass === user.pass) {
      req.session.isLoggedIn = true;
      console.log('User logged in successfully');
      console.log('User login successful');
      return res.redirect('/index.html'); // Redirect to index.html
    } else {
      console.error('Invalid email or password');
      return res.status(401).send('Invalid email or password');
    }
  });
});

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next(); // Continue to the next middleware or route handler
  } else {
    res.redirect('/login'); // Redirect to login page if not logged in
  }
};

// Render Maintainable page only if user is logged in
app.get('/index', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});



// Define a route to handle form submission and insert data into the ProductTestingLog table
// Modify the route to handle form submission and insert data into the ProductTestingLog table
app.post('/add-to-testing-log', (req, res) => {
  const { productId, modelName, testingStartDate, failureDate, maintenanceCost } = req.body;

  // Query to get ModelID based on ModelName
  const getModelIdQuery = 'SELECT ModelID FROM Models WHERE ModelName = ?';
  connection.query(getModelIdQuery, [modelName], (err, result) => {
    if (err) {
      console.error('Error getting ModelID:', err);
      res.status(500).json({ message: 'Error getting ModelID' });
    } else {
      if (result.length === 0) {
        res.status(404).json({ message: 'ModelName not found' });
      } else {
        const modelId = result[0].ModelID;

        // Insert data into ProductTestingLog table
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
      }
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
