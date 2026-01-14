import logging
import os

LOG_DIR = "/app/logs"
os.makedirs(LOG_DIR, exist_ok=True)

def logger(name="root"):
    """
    Retourne un logger configuré pour écrire dans /app/logs/<name>.log
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Évite d'ajouter plusieurs handlers si le logger existe déjà
    if not logger.handlers:
        file_handler = logging.FileHandler(os.path.join(LOG_DIR, f"{name}.log"))
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger