from mysql.connector import pooling
import dotenv
import os
from contextlib import contextmanager

dotenv.load_dotenv()

# Configure connection pool
connection_pool = pooling.MySQLConnectionPool(
  pool_name=os.getenv('DB_POOL_NAME'),
  pool_size=int(str(os.getenv('DB_POOL_SIZE'))),
  host=os.getenv('DB_HOST'),
  database=os.getenv('DB_NAME'),
  user=os.getenv('DB_USER'),
  password=os.getenv('DB_PASS')
)

@contextmanager
def open():
  cursor = None
  conn = None
  
  try:
    conn = connection_pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    yield (conn, cursor)
  finally:
    if cursor is not None:
      try: cursor.close()
      except Exception as e: print(f'Failed to close cursor: {e}')
      
    if conn is not None and conn.is_connected():
      try: conn.close()
      except Exception as e: print(f'Failed to close connection: {e}')