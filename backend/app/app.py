# app.py
import argparse
from utils.log_utils import logger

def ingest():
    from ingest.ingest_run import ingest_run
    log = logger("Ingest")  # variable différente
    log.info("📥 Lancement de l’ingestion...")
    ingest_run()
    log.info("✅ Ingestion terminée !")
    log.info("===============================================")

def etl():
    from etl.etl_run import etl_run
    log = logger("Etl")
    log.info("🔄 Lancement de l’ETL...")
    etl_run()
    log.info("✅ ETL terminé !")
    log.info("===============================================")
def training():
    log = logger("Training")
    from training.train import main
    log.info("🤖 Lancement du training ML...")
    main()
    log.info("✅ Training terminé !")
if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument("--mode", choices=["ingest", "etl", "training", "api"], required=True)

    args = parser.parse_args()

    if args.mode == "ingest":
        ingest()

    elif args.mode == "etl":
        etl()

    elif args.mode == "training":
        training()
