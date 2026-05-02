from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_connection


router = APIRouter(prefix="/api/products", tags=["Products"])


class ProductCreate(BaseModel):
    name: str
    url: str
    store: str
    target_price: float
    notes: str | None = None


@router.post("/")
def create_product(product: ProductCreate):
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO products (name, url, store, target_price, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                product.name,
                product.url,
                product.store,
                product.target_price,
                product.notes,
            ),
        )

        connection.commit()

        return {
            "message": "Produto cadastrado com sucesso",
            "product_id": cursor.lastrowid,
        }


@router.get("/")
def list_products():
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute("""
            SELECT *
            FROM products
            ORDER BY created_at DESC
        """)

        products = [dict(row) for row in cursor.fetchall()]

        return products


@router.get("/{product_id}")
def get_product(product_id: int):
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT *
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        product = cursor.fetchone()

        if product is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        return dict(product)



class PriceUpdate(BaseModel):
    current_price: float


@router.patch("/{product_id}/price")
def update_product_price(product_id: int, price_data: PriceUpdate):
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT current_price, target_price
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        product = cursor.fetchone()

        if product is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        previous_price = product["current_price"]
        target_price = product["target_price"]
        current_price = price_data.current_price

        if current_price <= target_price:
            status = "good_deal"
        else:
            status = "observing"


        cursor.execute(
            """
            INSERT INTO price_history (product_id, price)
            VALUES (?, ?)
            """,
            (product_id, current_price),
        )

        cursor.execute(
            """
            UPDATE products
            SET
                previous_price = ?,
                current_price = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                previous_price,
                current_price,
                status,
                product_id,
            ),
        )

        connection.commit()

        return {
            "message": "Preço atualizado com sucesso",
            "product_id": product_id,
            "previous_price": previous_price,
            "current_price": current_price,
            "target_price": target_price,
            "status": status,
        }


@router.get("/{product_id}/history")
def get_product_price_history(product_id: int):
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, product_id, price, collected_at
            FROM price_history
            WHERE product_id = ?
            ORDER BY collected_at ASC
            """,
            (product_id,),
        )

        history = [dict(row) for row in cursor.fetchall()]

        return history