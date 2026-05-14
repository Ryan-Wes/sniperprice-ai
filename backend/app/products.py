from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_connection
from app.scraper import buscar_preco


router = APIRouter(prefix="/api/products", tags=["Products"])


class ProductCreate(BaseModel):
    name: str
    url: str
    store: str
    target_price: float
    notes: str | None = None

class ProductUpdate(BaseModel):
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

@router.put("/{product_id}")
def update_product(product_id: int, product: ProductUpdate):
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        existing_product = cursor.fetchone()

        if existing_product is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        cursor.execute(
            """
            SELECT current_price
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        current_product = cursor.fetchone()
        current_price = current_product["current_price"]

        if current_price is not None and current_price <= product.target_price:
            status = "good_deal"
        else:
            status = "observing"

        cursor.execute(
            """
            UPDATE products
            SET
                name = ?,
                url = ?,
                store = ?,
                target_price = ?,
                notes = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                product.name,
                product.url,
                product.store,
                product.target_price,
                product.notes,
                status,
                product_id,
            ),
        )

        connection.commit()

        cursor.execute(
            """
            SELECT *
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        updated_product = cursor.fetchone()

        return dict(updated_product)


@router.delete("/{product_id}")
def delete_product(product_id: int):
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        product = cursor.fetchone()

        if product is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        cursor.execute(
            """
            DELETE FROM price_history
            WHERE product_id = ?
            """,
            (product_id,),
        )

        cursor.execute(
            """
            DELETE FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        connection.commit()

        return {"message": "Produto deletado com sucesso", "product_id": product_id}


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


@router.get("/{product_id}/debug-scrape")
async def debug_scrape(product_id: int):
    import httpx, re
    from app.scraper import _get_ml_token, _extrair_id_ml, buscar_preco

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT url FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    url = product["url"]
    results = {}

    # Testa geração do token
    token = await _get_ml_token()
    results["token"] = token[:20] + "..." if token else "FALHOU"
    results["id_info"] = _extrair_id_ml(url)

    if token:
        headers_auth = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=15) as client:
            # Testa item
            id_info = _extrair_id_ml(url)
            if id_info and id_info[0] == "item":
                r = await client.get(
                    f"https://api.mercadolibre.com/items/{id_info[1]}",
                    headers=headers_auth
                )
                data = r.json()
                results["items_api"] = {
                    "status": r.status_code,
                    "price": data.get("price"),
                    "title": data.get("title"),
                    "full_error": data if r.status_code != 200 else None,
                    "keys": list(data.keys())[:10]
                }

            # Testa produto
            produto_match = re.search(r"/p/(MLB\d+)", url)
            if produto_match:
                r2 = await client.get(
                    f"https://api.mercadolibre.com/products/{produto_match.group(1)}",
                    headers=headers_auth
                )
                data2 = r2.json()
                results["products_api"] = {
                    "status": r2.status_code,
                    "buy_box_winner": data2.get("buy_box_winner"),
                    "keys": list(data2.keys())
                }

                # Testa search por catalog_product_id
                r3 = await client.get(
                    "https://api.mercadolibre.com/sites/MLB/search",
                    params={"catalog_product_id": produto_match.group(1), "limit": 3},
                    headers=headers_auth
                )
                data3 = r3.json()
                results["search_catalog"] = {
                    "status": r3.status_code,
                    "results_count": len(data3.get("results", [])),
                    "first_prices": [
                        {"price": item.get("price"), "title": item.get("title", "")[:40]}
                        for item in data3.get("results", [])[:3]
                    ]
                }

    results["scraper_result"] = await buscar_preco(url)
    return results


@router.post("/{product_id}/scrape")
async def scrape_product(product_id: int):
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, url, current_price, target_price FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    preco = await buscar_preco(product["url"])

    if preco is None:
        raise HTTPException(status_code=422, detail="Não foi possível extrair o preço desta página")

    previous_price = product["current_price"]
    target_price = product["target_price"]
    status = "good_deal" if preco <= target_price else "observing"

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO price_history (product_id, price) VALUES (?, ?)",
            (product_id, preco),
        )
        cursor.execute(
            """
            UPDATE products
            SET previous_price = ?, current_price = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (previous_price, preco, status, product_id),
        )
        connection.commit()

    return {
        "product_id": product_id,
        "previous_price": previous_price,
        "current_price": preco,
        "status": status,
    }


@router.post("/scrape-all")
async def scrape_all_products():
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, url, current_price, target_price FROM products")
        products = [dict(row) for row in cursor.fetchall()]

    results = []
    for product in products:
        preco = await buscar_preco(product["url"])
        resultado = {"product_id": product["id"], "success": False, "current_price": None}

        if preco:
            previous_price = product["current_price"]
            target_price = product["target_price"]
            status = "good_deal" if preco <= target_price else "observing"

            with get_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(
                    "INSERT INTO price_history (product_id, price) VALUES (?, ?)",
                    (product["id"], preco),
                )
                cursor.execute(
                    """
                    UPDATE products
                    SET previous_price = ?, current_price = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (previous_price, preco, status, product["id"]),
                )
                connection.commit()

            resultado["success"] = True
            resultado["current_price"] = preco

        results.append(resultado)

    total = len(results)
    success = sum(1 for r in results if r["success"])

    return {
        "total": total,
        "success": success,
        "failed": total - success,
        "results": results,
    }