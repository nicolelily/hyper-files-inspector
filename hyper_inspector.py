#!/usr/bin/env python3
"""
Hyper File Inspector - Python Backend Service
Inspects Tableau .hyper files and extracts metadata and schema information
"""

import sys
import json
import os
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from tableauhyperapi import HyperProcess, Telemetry, Connection, CreateMode, HyperException
except ImportError:
    print(json.dumps({
        "error": "tableauhyperapi not installed. Run: pip install tableauhyperapi",
        "success": False
    }))
    sys.exit(1)


class HyperFileInspector:
    """Inspector for Tableau Hyper files"""
    
    def __init__(self):
        self.hyper_process = None
        
    def __enter__(self):
        """Start Hyper process"""
        try:
            self.hyper_process = HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU)
            return self
        except Exception as e:
            raise HyperException(f"Failed to start Hyper process: {str(e)}")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop Hyper process"""
        if self.hyper_process:
            self.hyper_process.close()
    
    def export_file_data(self, file_path: str, include_sample_only: bool = False, max_rows_per_table: int = None) -> Dict[str, Any]:
        """
        Export all data from a .hyper file to JSON format
        
        Args:
            file_path: Path to the .hyper file
            include_sample_only: If True, only export sample data (first 5 rows per table)
            max_rows_per_table: Maximum number of rows to export per table (None = all rows)
            
        Returns:
            Dictionary containing all file data in JSON format
        """
        if not os.path.exists(file_path):
            return {
                "error": f"File not found: {file_path}",
                "success": False
            }
        
        if not file_path.lower().endswith('.hyper'):
            return {
                "error": f"Not a .hyper file: {file_path}",
                "success": False
            }
        
        try:
            result = {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "file_size": os.path.getsize(file_path),
                "export_type": "sample_only" if include_sample_only else "full_data",
                "max_rows_per_table": max_rows_per_table,
                "success": True,
                "schemas": [],
                "tables": [],
                "total_tables": 0,
                "total_rows_exported": 0
            }
            
            # Connect to the Hyper file
            with Connection(
                endpoint=self.hyper_process.endpoint,
                database=file_path,
                create_mode=CreateMode.NONE
            ) as connection:
                
                # Get all schemas (excluding system ones)
                schemas_query = """
                    SELECT table_schema as schema_name 
                    FROM information_schema.tables 
                    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_temp', 'tableau')
                    GROUP BY table_schema
                """
                
                schemas = []
                try:
                    for row in connection.execute_list_query(schemas_query):
                        schema_name = row[0]
                        schemas.append(schema_name)
                except:
                    # Fallback to pg_tables if information_schema doesn't work
                    schemas_query = """
                        SELECT schemaname as schema_name 
                        FROM pg_tables 
                        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_temp', 'tableau')
                        GROUP BY schemaname
                    """
                    for row in connection.execute_list_query(schemas_query):
                        schema_name = row[0]
                        schemas.append(schema_name)
                
                result["schemas"] = schemas
                
                # Export data from all tables
                tables_data = []
                total_exported = 0
                
                for schema in schemas:
                    # Get tables in this schema
                    tables_query = f"""
                        SELECT tablename as table_name, 'TABLE' as table_type
                        FROM pg_tables 
                        WHERE schemaname = '{schema}'
                    """
                    
                    for table_row in connection.execute_list_query(tables_query):
                        table_name = table_row[0]
                        table_type = table_row[1]
                        full_table_name = f'"{schema}"."{table_name}"'
                        
                        # Get column information
                        columns_query = f"""
                            SELECT 
                                a.attname as column_name,
                                pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                                CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END as is_nullable,
                                NULL as column_default
                            FROM pg_attribute a
                            WHERE a.attrelid = '"{schema}"."{table_name}"'::regclass
                                AND a.attnum > 0 
                                AND NOT a.attisdropped
                            ORDER BY a.attnum
                        """
                        
                        columns = []
                        column_names = []
                        for col_row in connection.execute_list_query(columns_query):
                            column_info = {
                                "name": col_row[0],
                                "type": col_row[1],
                                "nullable": col_row[2] == "YES",
                                "default": col_row[3]
                            }
                            columns.append(column_info)
                            column_names.append(col_row[0])
                        
                        # Get row count
                        try:
                            count_query = f'SELECT COUNT(*) FROM {full_table_name}'
                            total_rows = connection.execute_scalar_query(count_query)
                        except:
                            total_rows = 0
                        
                        # Determine how many rows to export
                        if include_sample_only:
                            rows_to_export = min(5, total_rows)
                            data_query = f'SELECT * FROM {full_table_name} LIMIT 5'
                        elif max_rows_per_table:
                            rows_to_export = min(max_rows_per_table, total_rows)
                            data_query = f'SELECT * FROM {full_table_name} LIMIT {max_rows_per_table}'
                        else:
                            rows_to_export = total_rows
                            data_query = f'SELECT * FROM {full_table_name}'
                        
                        # Export all data
                        exported_data = []
                        try:
                            for data_row in connection.execute_list_query(data_query):
                                # Convert values to JSON-serializable format
                                row_data = {}
                                for i, value in enumerate(data_row):
                                    column_name = column_names[i]
                                    if value is None:
                                        row_data[column_name] = None
                                    elif hasattr(value, 'isoformat'):  # DateTime objects
                                        row_data[column_name] = value.isoformat()
                                    else:
                                        row_data[column_name] = value
                                exported_data.append(row_data)
                            
                            total_exported += len(exported_data)
                            
                        except Exception as e:
                            exported_data = []
                            print(f"Warning: Could not export data from {full_table_name}: {e}")
                        
                        table_info = {
                            "schema": schema,
                            "name": table_name,
                            "full_name": full_table_name,
                            "type": table_type,
                            "columns": columns,
                            "total_rows": total_rows,
                            "exported_rows": len(exported_data),
                            "data": exported_data
                        }
                        
                        tables_data.append(table_info)
                
                result["tables"] = tables_data
                result["total_tables"] = len(tables_data)
                result["total_rows_exported"] = total_exported
                
            return result
            
        except HyperException as e:
            return {
                "error": f"Hyper API error: {str(e)}",
                "success": False,
                "file_path": file_path
            }
        except Exception as e:
            return {
                "error": f"Unexpected error: {str(e)}",
                "success": False,
                "file_path": file_path
            }

    def inspect_file(self, file_path: str) -> Dict[str, Any]:
        """
        Inspect a single .hyper file and return metadata
        
        Args:
            file_path: Path to the .hyper file
            
        Returns:
            Dictionary containing file metadata and schema information
        """
        if not os.path.exists(file_path):
            return {
                "error": f"File not found: {file_path}",
                "success": False
            }
        
        if not file_path.lower().endswith('.hyper'):
            return {
                "error": f"Not a .hyper file: {file_path}",
                "success": False
            }
        
        try:
            result = {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "file_size": os.path.getsize(file_path),
                "success": True,
                "schemas": [],
                "tables": [],
                "total_tables": 0,
                "total_rows": 0
            }
            
            # Connect to the Hyper file
            with Connection(
                endpoint=self.hyper_process.endpoint,
                database=file_path,
                create_mode=CreateMode.NONE
            ) as connection:
                
                # Get all schemas
                schemas_query = """
                    SELECT nspname as schema_name 
                    FROM pg_namespace 
                    WHERE nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
                """
                
                schemas = []
                for row in connection.execute_list_query(schemas_query):
                    schema_name = row[0]
                    schemas.append(schema_name)
                
                result["schemas"] = schemas
                
                # Get all tables and their information
                tables_info = []
                total_rows = 0
                
                for schema in schemas:
                    # Get tables in this schema
                    tables_query = f"""
                        SELECT tablename as table_name, 'TABLE' as table_type
                        FROM pg_tables 
                        WHERE schemaname = '{schema}'
                    """
                    
                    for table_row in connection.execute_list_query(tables_query):
                        table_name = table_row[0]
                        table_type = table_row[1]
                        full_table_name = f'"{schema}"."{table_name}"'
                        
                        # Get column information
                        columns_query = f"""
                            SELECT 
                                a.attname as column_name,
                                pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                                CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END as is_nullable,
                                NULL as column_default
                            FROM pg_attribute a
                            WHERE a.attrelid = '"{schema}"."{table_name}"'::regclass
                                AND a.attnum > 0 
                                AND NOT a.attisdropped
                            ORDER BY a.attnum
                        """
                        
                        columns = []
                        for col_row in connection.execute_list_query(columns_query):
                            columns.append({
                                "name": col_row[0],
                                "type": col_row[1],
                                "nullable": col_row[2] == "YES",
                                "default": col_row[3]
                            })
                        
                        # Get row count
                        try:
                            count_query = f'SELECT COUNT(*) FROM {full_table_name}'
                            row_count = connection.execute_scalar_query(count_query)
                            total_rows += row_count
                        except:
                            row_count = "Unable to determine"
                        
                        # Get sample data (first 5 rows)
                        sample_data = []
                        try:
                            sample_query = f'SELECT * FROM {full_table_name} LIMIT 5'
                            for sample_row in connection.execute_list_query(sample_query):
                                # Convert values to JSON-serializable format
                                row_data = []
                                for value in sample_row:
                                    if value is None:
                                        row_data.append(None)
                                    elif hasattr(value, 'isoformat'):  # DateTime objects
                                        row_data.append(value.isoformat())
                                    else:
                                        row_data.append(str(value))
                                sample_data.append(row_data)
                        except Exception as e:
                            sample_data = [f"Error retrieving sample data: {str(e)}"]
                        
                        table_info = {
                            "schema": schema,
                            "name": table_name,
                            "full_name": full_table_name,
                            "type": table_type,
                            "columns": columns,
                            "row_count": row_count,
                            "sample_data": sample_data
                        }
                        
                        tables_info.append(table_info)
                
                result["tables"] = tables_info
                result["total_tables"] = len(tables_info)
                result["total_rows"] = total_rows
                
            return result
            
        except HyperException as e:
            return {
                "error": f"Hyper API error: {str(e)}",
                "success": False,
                "file_path": file_path
            }
        except Exception as e:
            return {
                "error": f"Unexpected error: {str(e)}",
                "success": False,
                "file_path": file_path
            }
    
    def discover_hyper_files(self, directory: str) -> Dict[str, Any]:
        """
        Discover all .hyper files in a directory and its subdirectories
        
        Args:
            directory: Directory to search
            
        Returns:
            Dictionary containing list of found .hyper files
        """
        if not os.path.exists(directory):
            return {
                "error": f"Directory not found: {directory}",
                "success": False
            }
        
        if not os.path.isdir(directory):
            return {
                "error": f"Not a directory: {directory}",
                "success": False
            }
        
        try:
            hyper_files = []
            directory_path = Path(directory)
            
            # Search for .hyper files recursively
            for hyper_file in directory_path.rglob("*.hyper"):
                file_info = {
                    "path": str(hyper_file.absolute()),
                    "name": hyper_file.name,
                    "size": hyper_file.stat().st_size,
                    "modified": hyper_file.stat().st_mtime
                }
                hyper_files.append(file_info)
            
            return {
                "success": True,
                "directory": directory,
                "files_found": len(hyper_files),
                "files": hyper_files
            }
            
        except Exception as e:
            return {
                "error": f"Error discovering files: {str(e)}",
                "success": False,
                "directory": directory
            }


def main():
    """Main entry point for the script"""
    parser = argparse.ArgumentParser(description="Inspect Tableau Hyper files")
    parser.add_argument("command", choices=["inspect", "discover", "export"], help="Command to execute")
    parser.add_argument("path", help="Path to .hyper file or directory")
    parser.add_argument("--output", "-o", help="Output file (optional, defaults to stdout)")
    parser.add_argument("--sample-only", action="store_true", help="Export only sample data (first 5 rows per table)")
    parser.add_argument("--max-rows", type=int, help="Maximum number of rows to export per table")
    
    args = parser.parse_args()
    
    try:
        with HyperFileInspector() as inspector:
            if args.command == "inspect":
                result = inspector.inspect_file(args.path)
            elif args.command == "discover":
                result = inspector.discover_hyper_files(args.path)
            elif args.command == "export":
                result = inspector.export_file_data(
                    args.path, 
                    include_sample_only=args.sample_only,
                    max_rows_per_table=args.max_rows
                )
            else:
                result = {"error": f"Unknown command: {args.command}", "success": False}
            
            # Output result as JSON
            json_output = json.dumps(result, indent=2, default=str)
            
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(json_output)
            else:
                print(json_output)
                
    except Exception as e:
        error_result = {
            "error": f"Critical error: {str(e)}",
            "success": False
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()