import os
from dotenv import load_dotenv

load_dotenv(".env")
print("ENV VAR VALUE: ", os.getenv("GOOGLE_CLIENT_ID"))
