import sys
import matplotlib.pyplot as plt
import numpy as np
import mysql.connector
from decimal import Decimal

def calculateTotalMaintenanceCost(cursor, testingStartDate, failureDate):
    query = '''
        SELECT SUM(MaintenanceCost) AS TotalMaintenanceCost
        FROM ProductTestingLog
        WHERE TestingStartDate <= %s AND FailureDate <= %s;
    '''
    cursor.execute(query, (testingStartDate, failureDate))
    row = cursor.fetchone()
    totalMaintenanceCost = Decimal(row['TotalMaintenanceCost']) if row else Decimal(0)
    return totalMaintenanceCost

def calculateDurationInMonths(startDate, endDate):
    start = startDate
    end = endDate
    diffInMonths = (end.year - start.year) * 12 + (end.month - start.month)
    return diffInMonths

def generatePlots(model_name, x_values, y_values):
    # Line chart
    plt.plot(x_values, y_values, label='Total Profit vs. Duration', marker='o')
    plt.xlabel('Duration (Months)')
    plt.ylabel('Total Profit')
    plt.title('Line Chart: Total Profit vs. Duration')
    plt.legend()
    plt.savefig(f'line_chart_{model_name}.png')
    print(f"Generating line chart for model: {model_name}")

    # Scatter plot
    plt.figure()  # Create a new figure for scatter plot
    plt.scatter(x_values, y_values, label='Maintenance Cost vs. Months')
    plt.xlabel('Duration (Months)')
    plt.ylabel('Total Maintenance Cost')
    plt.title('Scatter Plot: Maintenance Cost vs. Duration')
    plt.legend()
    plt.savefig(f'scatter_plot_{model_name}.png')
    print(f"Generating scatter plot for model: {model_name}")

    # Display the plots
    plt.show()

def main():
    if len(sys.argv) < 4:
        print("Usage: python scatter_plot1.py <model_name> <product_cost> <production_cost>")
        sys.exit(1)

    model_name = sys.argv[1]
    product_cost = Decimal(sys.argv[2])
    production_cost = Decimal(sys.argv[3])

    config = {
        'host': 'quandale-dingle-warranty-predictor-warranty-prediction.a.aivencloud.com',
        'port': 16942,
        'user': 'avnadmin',
        'password': 'AVNS_NYRB2lUvSBvTE349hkA',
        'database': 'defaultdb',
        'ssl_ca': 'ca.pem',
        'ssl_verify_cert': True,
    }

    try:
        connection = mysql.connector.connect(**config)
        if connection.is_connected():
            print(f'Connected to MySQL Server: {config["host"]}:{config["port"]}')
            cursor = connection.cursor(dictionary=True)
            cursor.execute('SELECT ModelID FROM Models WHERE ModelName = %s', (model_name,))
            modelsResult = cursor.fetchall()

            if not modelsResult:
                print('No model found with the name:', model_name)
            else:
                modelID = modelsResult[0]['ModelID']
                cursor.execute('SELECT * FROM ProductTestingLog WHERE ModelID = %s ORDER BY ABS(FailureDate - TestingStartDate)', (modelID,))
                testingLogResult = cursor.fetchall()
                results = []

                for row in testingLogResult:
                    TestingStartDate = row['TestingStartDate']
                    FailureDate = row['FailureDate']
                    totalMaintenanceCost = calculateTotalMaintenanceCost(cursor, TestingStartDate, FailureDate)
                    durationInMonths = calculateDurationInMonths(TestingStartDate, FailureDate)
                    totalProfit = product_cost - (production_cost + totalMaintenanceCost)
                    results.append([totalProfit, durationInMonths])

                print('Result:', results)
                x_values = [result[1] for result in results]  # Duration in months
                y_values = [result[0] for result in results]  # Total profit
                generatePlots(model_name, x_values, y_values)

    except mysql.connector.Error as e:
        print(f'Error: {e}')

    finally:
        if connection.is_connected():
            connection.close()
            print('Connection closed')

if __name__ == "__main__":
    main()
