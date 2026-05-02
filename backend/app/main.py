from fastapi import FastAPI

from app.database import init_db
from app.products import router as products_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SniperPrice AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # depois a gente restringe, relaxa
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(products_router)


@app.get("/")
def read_root():
    return {"message": "SniperPrice AI API rodando 🚀"}