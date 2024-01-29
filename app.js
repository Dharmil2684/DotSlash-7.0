const fs = require('fs');
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');
const session = require('express-session');

const app = express();
app.use(bodyParser.json());

// Serve static files (including CSS)
app.use(express.static(__dirname));

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'stats.html'));
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
  // Private connection details
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

app.get('/calculate-maintenance-data', async (req, res) => {
  try {
    const modelName = req.query.modelName;

    // Execute the SQL query to retrieve ModelID based on ModelName
    const modelsResult = await executeQuery('SELECT ModelID FROM Models WHERE ModelName = ?', [modelName]);

    if (modelsResult.length === 0) {
      console.error('No model found with the name:', modelName);
      return res.status(404).json({ message: 'Model not found' });
    }

    const modelID = modelsResult[0].ModelID;

    // Execute the SQL query to retrieve ProductTestingLog data based on ModelID
    const testingLogResult = await executeQuery('SELECT * FROM ProductTestingLog WHERE ModelID = ? ORDER BY ABS(FailureDate - TestingStartDate)', [modelID]);

    // Initialize 2D array to store results
    const results = [];

    // Iterate over each row in the testing log
    for (const row of testingLogResult) {
      const { TestingStartDate, FailureDate } = row;

      // Calculate total maintenance cost
      const totalMaintenanceCost = await calculateTotalMaintenanceCost(TestingStartDate, FailureDate);

      // Calculate duration in months
      const durationInMonths = calculateDurationInMonths(TestingStartDate, FailureDate);

      // Push the result to the 2D array
      results.push([totalMaintenanceCost, durationInMonths]);
    }

    // Output the 2D array
    console.log('Result:', results);

    // Send the results as JSON response
    res.json({ results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to execute SQL queries with Promises
function executeQuery(query, values) {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Function to calculate total maintenance cost with a Promise
function calculateTotalMaintenanceCost(testingStartDate, failureDate) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT SUM(MaintenanceCost) AS TotalMaintenanceCost
      FROM ProductTestingLog
      WHERE TestingStartDate <= ? AND FailureDate <= ?;
    `;
    connection.query(query, [testingStartDate, failureDate], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const totalMaintenanceCost = row[0].TotalMaintenanceCost || 0;
        resolve(totalMaintenanceCost);
      }
    });
  });
}

// Serve the HTML page
app.use(express.static('public'));

app.get('/run-python-script1', (req, res) => {
  const pythonScript = 'scatter_plot1.py';

  // Execute the Python script
  exec(`python ${pythonScript}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error.message}`);
      res.status(500).json({ message: 'Error executing Python script' });
      return;
    }

    console.log('Python script executed successfully');
    console.log('Python script output:', stdout);

    // Optionally, you can send the Python script output as a response
    res.json({ message: 'Python script executed successfully', output: stdout });
  });
});

app.get('/generate-chart-image', async (req, res) => {
  const modelName = req.query.modelName || 'DefaultModel';
  const productCost = req.query.productCost || 0;
  const productionCost = req.query.productionCost || 0;

  // Execute the Python script for scatter plot
  const pythonScriptScatter = 'scatter_plot1.py';
  const pythonCommandScatter = `python ${pythonScriptScatter} ${modelName} ${productCost} ${productionCost}`;

  // Execute the Python script for line chart
  const pythonScriptLine = 'line_chart.py';
  const pythonCommandLine = `python ${pythonScriptLine} ${modelName} ${productCost} ${productionCost}`;

  try {
    // Execute the Python script for scatter plot
    const { stdout: scatterStdout, stderr: scatterStderr } = await execAsync(pythonCommandScatter);

    if (scatterStderr) {
      console.error(`Python script for scatter plot stderr: ${scatterStderr}`);
      return res.status(500).json({ message: 'Python script for scatter plot stderr' });
    }

    console.log(`Python script for scatter plot stdout: ${scatterStdout}`);

    // Execute the Python script for line chart
    const { stdout: lineStdout, stderr: lineStderr } = await execAsync(pythonCommandLine);

    if (lineStderr) {
      console.error(`Python script for line chart stderr: ${lineStderr}`);
      return res.status(500).json({ message: 'Python script for line chart stderr' });
    }

    console.log(`Python script for line chart stdout: ${lineStdout}`);

    // Send both scatter plot and line chart images as a response
    const scatterImagePath = path.join(__dirname, `scatter_plot1_${modelName}.png`);
    const lineImagePath = path.join(__dirname, `line_chart_${modelName}.png`);

    res.json({
      scatterPlotImage: scatterImagePath,
      lineChartImage: lineImagePath,
    });
  } catch (error) {
    console.error(`Error running Python scripts: ${error.message}`);
    res.status(500).json({ message: 'Error running Python scripts' });
  }
});

app.get('/generate-scatterplot1', (req, res) => {
  exec('python scatter_plot1.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error.message}`);
      res.status(500).json({ message: 'Error executing Python script' });
      return;
    }

    // Read the scatterplot image and send it as a response
    const imagePath = path.join(__dirname, 'scatterplot.png');
    fs.readFile(imagePath, (err, data) => {
      if (err) {
        console.error(`Error reading scatterplot image: ${err.message}`);
        res.status(500).json({ message: 'Error reading scatterplot image' });
        return;
      }

      // Set the appropriate headers for image response
      res.setHeader('Content-Type', 'image/png');
      res.send(data);
    });
  });
});


const util = require('util');
const execAsync = util.promisify(exec);

app.get('/line-chart-image', async (req, res) => {
  const modelName = req.query.modelName || 'DefaultModel';
  const productCost = req.query.productCost || 0;
  const productionCost = req.query.productionCost || 0;

  const pythonScriptLine = 'line_chart.py';
  const pythonCommandLine = `python ${pythonScriptLine} ${modelName} ${productCost} ${productionCost}`;

  try {
    const { stdout, stderr } = await execAsync(pythonCommandLine);

    if (stderr) {
      console.error(`Python script for line chart stderr: ${stderr}`);
      return res.status(500).json({ message: 'Python script for line chart stderr' });
    }

    console.log(`Python script for line chart stdout: ${stdout}`);

    // Send the line chart image as a response after the Python script has finished
    const imagePath = path.join(__dirname, `line_chart_${modelName}.png`);
    res.sendFile(imagePath);
  } catch (error) {
    console.error(`Error running Python script for line chart: ${error.message}`);
    res.status(500).json({ message: 'Error running Python script for line chart' });
  }
});

// Function to execute Python scripts with Promises
function runPythonScript(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}


app.get('/scatter-plot1-image', (req, res) => {
  const modelName = req.query.modelName || 'DefaultModel';

  // NEW: Include productCost and productionCost as command-line arguments
  const productCost = req.query.productCost || 0; // Set default value if not provided
  const productionCost = req.query.productionCost || 0; // Set default value if not provided

  // Define the Python command for scatter plot
  const pythonScript = 'scatter_plot1.py';
  const pythonCommandScatter = `python ${pythonScript} ${modelName} ${productCost} ${productionCost}`;

  // Execute the Python script for scatter plot
  exec(pythonCommandScatter, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running Python script for scatter plot: ${error.message}`);
      return res.status(500).json({ message: 'Error running Python script for scatter plot' });
    }
    if (stderr) {
      console.error(`Python script stderr: ${stderr}`);
      return res.status(500).json({ message: 'Python script stderr' });
    }
    console.log(`Python script stdout: ${stdout}`);

    // Send the scatter plot image as a response
    const imagePath = path.join(__dirname, `scatter_plot1_${modelName}.png`);
    res.sendFile(imagePath);
  });
});




// Define a route to generate the distribution graph
app.get('/distribution-graph', (req, res) => {
  const query = 'SELECT failureDate FROM ProductTestingLog ORDER BY failureDate ASC';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching failure dates:', err);
      res.status(500).json({ message: 'Error fetching failure dates' });
    } else {
      const failureDates = results.map(result => result.failureDate);
      const distributionData = createDistributionData(failureDates);

      // Send the distribution data as JSON response
      res.json(distributionData);
    }
  });
});

// Helper function to create distribution data
function createDistributionData(dates) {
  const distributionData = {};

  // Iterate through dates and count occurrences for each month
  dates.forEach(date => {
    const monthYear = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric' });
    distributionData[monthYear] = (distributionData[monthYear] || 0) + 1;
  });

  return distributionData;
}

app.post('/calculate-optimal-warranty', async (req, res) => {
  try {
    console.log('Received POST request to calculate optimal warranty.');

    const modelName = req.body.modelName;
    const productCost = parseFloat(req.body.productCost);
    const productionCost = parseFloat(req.body.productionCost);
    const desiredProfitMarginPercent = parseFloat(req.body.desiredProfitMarginPercent);

    console.log(`Model Name: ${modelName}`);
    console.log(`Product Cost: ${productCost}`);
    console.log(`Production Cost: ${productionCost}`);
    console.log(`Desired Profit Margin Percent: ${desiredProfitMarginPercent}`);

    if (isNaN(productCost) || isNaN(productionCost) || isNaN(desiredProfitMarginPercent)) {
      console.log('Invalid input values. Please enter valid numeric values.');
      return res.status(400).json({ message: 'Invalid input values. Please enter valid numeric values.' });
    }

    console.log('Fetching unique product IDs...');
    const uniqueProductIds = await getUniqueProductIds(modelName);
    console.log('Unique Product IDs:', uniqueProductIds);

    const numProducts = uniqueProductIds.length;
    console.log(`Number of Products: ${numProducts}`);

    let warrantyDuration = 0; // in days
    let totalMaintenanceCost = 0;

    console.log('Fetching maintenance costs...');
    const maintenanceCosts = await getMaintenanceCosts(modelName);
    console.log('Maintenance Costs:', maintenanceCosts);

    for (let row of maintenanceCosts) {
      if (!uniqueProductIds.includes(row.ProductID)) {
        continue;
      }

      totalMaintenanceCost += parseFloat(row.MaintenanceCost);

      const numerator = numProducts * parseFloat(productCost) - (numProducts * parseFloat(productionCost) + totalMaintenanceCost);
      const denominator = numProducts * parseFloat(productionCost);  // Ensure denominator is non-negative

      // Ensure that the value inside the square root is non-negative
      const profitMarginPercent = 100 * numerator / denominator;

      console.log(`Profit Margin Percent: ${profitMarginPercent}`);
      console.log('');

      if (isNaN(profitMarginPercent) || profitMarginPercent < parseFloat(desiredProfitMarginPercent)) {
        console.log('Profit margin falls below the desired threshold or is NaN. Stopping.');
        break;
      }

      warrantyDuration++;
    }
    
    // Execute the Python script for scatter plot
    exec(pythonCommandScatter, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script for scatter plot: ${error.message}`);
        return res.status(500).json({ message: 'Error executing Python script for scatter plot' });
      }
      if (stderr) {
        console.error(`Python script for scatter plot stderr: ${stderr}`);
        return res.status(500).json({ message: 'Python script for scatter plot stderr' });
      }
      console.log(`Python script for scatter plot stdout: ${stdout}`);

      // Send the scatter plot image as a response
      const scatterImagePath = path.join(__dirname, `scatter_plot1_${modelName}.png`);

      // NEW: Include line chart in the response
      const pythonScriptLine = 'line_chart.py';
      const pythonCommandLine = `python ${pythonScriptLine} ${modelName} ${productCost} ${productionCost}`;

      // Execute the Python script for line chart
      exec(pythonCommandLine, (errorLine, stdoutLine, stderrLine) => {
        if (errorLine) {
          console.error(`Error executing Python script for line chart: ${errorLine.message}`);
          return res.status(500).json({ message: 'Error executing Python script for line chart' });
        }
        if (stderrLine) {
          console.error(`Python script for line chart stderr: ${stderrLine}`);
          return res.status(500).json({ message: 'Python script for line chart stderr' });
        }
        console.log(`Python script for line chart stdout: ${stdoutLine}`);

        // Send the line chart image as a response
        const lineImagePath = path.join(__dirname, `line_chart_${modelName}.png`);

        // Send both scatter plot and line chart images in the response
        res.json({
          scatterPlotImage: scatterImagePath,
          lineChartImage: lineImagePath,
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

function getUniqueProductIds(modelName) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT DISTINCT ProductID FROM ProductTestingLog WHERE ModelID = (SELECT ModelID FROM Models WHERE ModelName = ?)';
    console.log('Executing SQL Query for Unique Product IDs...');
    connection.query(query, [modelName], (err, result) => {
      if (err) {
        console.error('Error fetching Unique Product IDs:', err);
        reject(err);
      } else {
        console.log('Unique Product IDs Fetched Successfully.');
        resolve(result.map(row => row.ProductID));
      }
    });
  });
}

function getMaintenanceCosts(modelName) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM ProductTestingLog WHERE ModelID = (SELECT ModelID FROM Models WHERE ModelName = ?) ORDER BY ABS(FailureDate - TestingStartDate)';
    console.log('Executing SQL Query for Maintenance Costs...');
    connection.query(query, [modelName], (err, result) => {
      if (err) {
        console.error('Error fetching Maintenance Costs:', err);
        reject(err);
      } else {
        console.log('Maintenance Costs Fetched Successfully.');
        resolve(result);
      }
    });
  });
}





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
