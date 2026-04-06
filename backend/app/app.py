# app.py
import argparse
from utils.log_utils import logger
import uvicorn

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


def api():
    log = logger("API")
    log.info("🌐 Lancement de l'API...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--mode", choices=["ingest", "etl", "training", "api"], required=True
    )

    args = parser.parse_args()

    if args.mode == "ingest":
        ingest()

    elif args.mode == "etl":
        etl()

    elif args.mode == "training":
        training()

    elif args.mode == "api":
        api()
