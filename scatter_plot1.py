import sys
import matplotlib.pyplot as plt
import numpy as np
import mysql.connector

model_name = sys.argv[1] if len(sys.argv) > 1 else 'DefaultModel'

# Function to calculate total maintenance cost
def calculateTotalMaintenanceCost(cursor, testingStartDate, failureDate):
    query = '''
        SELECT SUM(MaintenanceCost) AS TotalMaintenanceCost
        FROM ProductTestingLog
        WHERE TestingStartDate <= %s AND FailureDate <= %s;
    '''
    cursor.execute(query, (testingStartDate, failureDate))
    row = cursor.fetchone()
    totalMaintenanceCost = row['TotalMaintenanceCost'] if row else 0
    return totalMaintenanceCost

# Function to calculate duration in months
def calculateDurationInMonths(startDate, endDate):
    start = startDate
    end = endDate
    diffInMonths = (end.year - start.year) * 12 + (end.month - start.month)
    return diffInMonths

# Connection details
config = {
    'host': 'quandale-dingle-warranty-predictor-warranty-prediction.a.aivencloud.com',
    'port': 16942,
    'user': 'avnadmin',
    'password': 'AVNS_NYRB2lUvSBvTE349hkA',
    'database': 'defaultdb',
    'ssl_ca': 'ca.pem',  # Make sure the 'ca.pem' file is in the same directory as this script
    'ssl_verify_cert': True,
}

# Establish a connection
try:
    connection = mysql.connector.connect(**config)

    if connection.is_connected():
        print(f'Connected to MySQL Server: {config["host"]}:{config["port"]}')

        # Execute the SQL query to retrieve ModelID based on Mname
        cursor = connection.cursor(dictionary=True)
        cursor.execute('SELECT ModelID FROM Models WHERE ModelName = %s', (model_name,))
        modelsResult = cursor.fetchall()

        if not modelsResult:
            print('No model found with the name:', Mname)
        else:
            modelID = modelsResult[0]['ModelID']

            # Execute the SQL query to retrieve ProductTestingLog data based on ModelID
            cursor.execute('SELECT * FROM ProductTestingLog WHERE ModelID = %s ORDER BY ABS(FailureDate - TestingStartDate)', (modelID,))
            testingLogResult = cursor.fetchall()

            # Initialize 2D array to store results
            results = []

            # Iterate over each row in the testing log
            for row in testingLogResult:
                TestingStartDate = row['TestingStartDate']
                FailureDate = row['FailureDate']

                # Calculate total maintenance cost
                totalMaintenanceCost = calculateTotalMaintenanceCost(cursor, TestingStartDate, FailureDate)

                # Calculate duration in months
                durationInMonths = calculateDurationInMonths(TestingStartDate, FailureDate)

                # Push the result to the 2D array
                results.append([totalMaintenanceCost, durationInMonths])

            # Output the 2D array
            print('Result:', results)

            # Extracting data for scatter plot
            x_values = [result[1] for result in results]  # Duration in months
            y_values = [result[0] for result in results]  # Total maintenance cost

            # Scatter plot
            plt.scatter(x_values, y_values, label='Maintenance Cost vs. Months')
            plt.xlabel('Duration (Months)')
            plt.ylabel('Total Maintenance Cost')
            plt.title('Scatter Plot: Maintenance Cost vs. Duration')
            plt.legend()

            # Save the plot to a file
            plt.savefig(f'scatter_plot1_{model_name}.png')
            print(f"Generating scatter plot for model: {model_name}")   

            # # Display the plot
            # plt.show()

except mysql.connector.Error as e:
    print(f'Error: {e}')

finally:
    # Close the connection when done
    if connection.is_connected():
        connection.close()
        print('Connection closed')
