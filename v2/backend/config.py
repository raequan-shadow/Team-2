import os
from pathlib import Path
from dotenv import load_dotenv

# Locate the project and repository folders
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Load environment variables from the repository root
load_dotenv(ROOT_DIR / ".env")

# Read the database path from the environment
db_path = os.getenv("DB_PATH", "./database/smartpark.db")

# Resolve relative paths from the v2 project folder
DATABASE_PATH = (BASE_DIR / db_path).resolve()
DATABASE_DIR = DATABASE_PATH.parent