#!/usr/bin/env python3
"""
Create a sample .hyper file for testing the inspector
"""

import os
from datetime import datetime, date
from tableauhyperapi import HyperProcess, Telemetry, Connection, CreateMode, \
    TableDefinition, SqlType, TableName, Inserter, \
    escape_name, escape_string_literal, HyperException, NOT_NULLABLE, NULLABLE

def create_sample_hyper_file():
    """Create a sample .hyper file with test data"""
    
    # Sample data
    sample_customers = [
        (1, "Alice Johnson", "alice@email.com", "Premium", date(2023, 1, 15)),
        (2, "Bob Smith", "bob@email.com", "Standard", date(2023, 2, 20)),
        (3, "Carol Davis", "carol@email.com", "Premium", date(2023, 1, 10)),
        (4, "David Wilson", "david@email.com", "Basic", date(2023, 3, 5)),
        (5, "Eva Brown", "eva@email.com", "Standard", date(2023, 2, 28))
    ]
    
    sample_orders = [
        (101, 1, "Widget A", 2, 25.99, date(2023, 3, 1)),
        (102, 1, "Widget B", 1, 45.50, date(2023, 3, 2)),
        (103, 2, "Widget A", 3, 25.99, date(2023, 3, 3)),
        (104, 3, "Widget C", 1, 120.00, date(2023, 3, 4)),
        (105, 2, "Widget B", 2, 45.50, date(2023, 3, 5)),
        (106, 4, "Widget A", 1, 25.99, date(2023, 3, 6)),
        (107, 5, "Widget C", 1, 120.00, date(2023, 3, 7)),
        (108, 3, "Widget B", 3, 45.50, date(2023, 3, 8))
    ]
    
    # Create the .hyper file
    with HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU) as hyper:
        
        # Create and open connection to new .hyper file
        with Connection(endpoint=hyper.endpoint, 
                       database="sample-data.hyper", 
                       create_mode=CreateMode.CREATE_AND_REPLACE) as connection:
            
            # Create customers table
            customers_table = TableDefinition(
                table_name=TableName("SampleDB", "Customers"),
                columns=[
                    TableDefinition.Column("customer_id", SqlType.big_int(), NOT_NULLABLE),
                    TableDefinition.Column("name", SqlType.text(), NOT_NULLABLE),
                    TableDefinition.Column("email", SqlType.text(), NULLABLE),
                    TableDefinition.Column("tier", SqlType.text(), NULLABLE),
                    TableDefinition.Column("signup_date", SqlType.date(), NULLABLE)
                ]
            )
            
            # Create orders table
            orders_table = TableDefinition(
                table_name=TableName("SampleDB", "Orders"),
                columns=[
                    TableDefinition.Column("order_id", SqlType.big_int(), NOT_NULLABLE),
                    TableDefinition.Column("customer_id", SqlType.big_int(), NOT_NULLABLE),
                    TableDefinition.Column("product_name", SqlType.text(), NOT_NULLABLE),
                    TableDefinition.Column("quantity", SqlType.int(), NOT_NULLABLE),
                    TableDefinition.Column("unit_price", SqlType.double(), NOT_NULLABLE),
                    TableDefinition.Column("order_date", SqlType.date(), NULLABLE)
                ]
            )
            
            # Create schema first
            connection.catalog.create_schema("SampleDB")
            
            # Create the tables
            connection.catalog.create_table(customers_table)
            connection.catalog.create_table(orders_table)
            
            # Insert data into customers table
            with Inserter(connection, customers_table) as inserter:
                for customer in sample_customers:
                    inserter.add_row(customer)
                inserter.execute()
            
            # Insert data into orders table
            with Inserter(connection, orders_table) as inserter:
                for order in sample_orders:
                    inserter.add_row(order)
                inserter.execute()
            
            print("✅ Sample .hyper file 'sample-data.hyper' created successfully!")
            print("   - Contains 2 tables: Customers (5 rows) and Orders (8 rows)")
            print("   - Schema: SampleDB")
            print("   - Ready for testing with the inspector")

if __name__ == "__main__":
    try:
        create_sample_hyper_file()
    except Exception as e:
        print(f"❌ Error creating sample file: {e}")