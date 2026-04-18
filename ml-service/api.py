# api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from datetime import datetime, timedelta
import math
from typing import Optional

# ML libraries
from sklearn.linear_model import LinearRegression
import pandas as pd

app = FastAPI(title="Fast-Commerce ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000")


class ForecastRequest(BaseModel):
    storeId: str
    itemId: str


class StoreForecastRequest(BaseModel):
    storeId: str


class ForecastResponse(BaseModel):
    suggestedQty: int
    confidence: float
    reasoning: str
    itemName: Optional[str] = None


def heuristic_from_orders_for_item(orders, item_id, item_name: Optional[str] = None):
    """
    Fallback heuristic. Returns (suggested_qty:int, confidence:float, reasoning:str)
    Now accepts optional item_name and includes it in the reasoning string when provided.
    """
    total_sold = 0
    relevant_count = 0
    for order in orders:
        for o_item in order.get("items", []):
            if o_item.get("item", {}).get("_id") == item_id:
                qty = o_item.get("quantity", 0)
                total_sold += qty
                relevant_count += 1
                break  # count order once

    days = 7
    average_daily_sales = total_sold / days if days > 0 else 0
    suggested_qty = math.ceil(average_daily_sales * 1.2)
    suggested_qty = max(suggested_qty, 5)

    confidence = min(0.9, 0.3 + (relevant_count * 0.1)) if relevant_count else 0.3

    if item_name:
        reasoning = (
            f"Fallback heuristic for {item_name}: "
            f"Based on {total_sold} units sold in the last 7 days ({average_daily_sales:.1f}/day)."
        )
    else:
        reasoning = f"Fallback heuristic: Based on {total_sold} units sold in the last 7 days ({average_daily_sales:.1f}/day)."

    return suggested_qty, confidence, reasoning


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Fast-Commerce ML Service"
    }


@app.post("/forecast", response_model=ForecastResponse)
async def forecast_item(request: ForecastRequest):
    """
    ML-backed forecast for a single item with safe fallback to original heuristic.
    Returns an optional itemName field and ensures fallback reasoning mentions the item name when possible.
    """
    try:
        seven_days_ago = datetime.now() - timedelta(days=7)

        # fetch orders
        try:
            orders_response = requests.get(
                f"{BACKEND_URL}/api/orders/ml/public",
                params={"storeId": request.storeId, "since": seven_days_ago.isoformat()},
                timeout=20
            )
        except requests.RequestException as e:
            print(f"Request exception fetching orders: {e}")
            raise HTTPException(status_code=503, detail=f"Backend service unavailable: {str(e)}")

        if orders_response.status_code != 200:
            print(f"Orders response error: {orders_response.status_code} {orders_response.text}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch orders from backend: {orders_response.text}")

        orders_data = orders_response.json()
        orders = orders_data.get("orders", [])

        # Try to fetch item name from store items endpoint (if available)
        item_name = None
        try:
            items_response = requests.get(f"{BACKEND_URL}/api/items/store/{request.storeId}", timeout=10)
            if items_response.status_code == 200:
                items_list = items_response.json().get("items", [])
                item_name = next((it.get("name") for it in items_list if it.get("_id") == request.itemId), None)
        except Exception:
            # Not critical — fail silently and proceed without item name
            item_name = None

        if not orders:
            # no orders at all -> fallback to default min (mention item name if we have it)
            reasoning = "No order data available, default suggestion."
            if item_name:
                reasoning = f"{item_name}: {reasoning}"
            return ForecastResponse(suggestedQty=5, confidence=0.3, reasoning=reasoning, itemName=item_name)

        # Build rows for this item from orders
        rows = []
        for order in orders:
            for item in order.get("items", []):
                if item.get("item", {}).get("_id") == request.itemId:
                    rows.append({
                        "date": order.get("createdAt"),
                        "quantity": item.get("quantity", 0),
                        "price": item.get("item", {}).get("price", 0)
                    })

        # If no item-specific rows -> fallback heuristic (pass item_name)
        if not rows:
            suggested_qty, confidence, reasoning = heuristic_from_orders_for_item(orders, request.itemId, item_name)
            return ForecastResponse(suggestedQty=suggested_qty, confidence=confidence, reasoning=reasoning, itemName=item_name)

        # Build DataFrame safely
        try:
            df = pd.DataFrame(rows)
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df = df.dropna(subset=["date"])
            if "price" not in df.columns:
                df["price"] = 0.0
            df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0.0)
            df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0.0)
            df["day_of_week"] = df["date"].dt.weekday
        except Exception as e:
            print(f"Pandas parsing failed: {e}")
            # fallback to heuristic
            suggested_qty, confidence, reasoning = heuristic_from_orders_for_item(orders, request.itemId, item_name)
            return ForecastResponse(suggestedQty=suggested_qty, confidence=confidence, reasoning=reasoning, itemName=item_name)

        # If insufficient rows for ML (e.g., <2), fallback
        if len(df) < 2:
            suggested_qty, confidence, reasoning = heuristic_from_orders_for_item(orders, request.itemId, item_name)
            return ForecastResponse(suggestedQty=suggested_qty, confidence=confidence, reasoning=reasoning, itemName=item_name)

        # Try ML training and prediction, but catch any ML error and fallback
        try:
            X = df[["day_of_week", "price"]].values
            y = df["quantity"].values

            model = LinearRegression()
            model.fit(X, y)

            today = pd.Timestamp.now().weekday()
            avg_price = float(df["price"].mean()) if len(df) > 0 else 0.0
            pred = model.predict([[today, avg_price]])[0]

            # if prediction is NaN or negative, fallback
            if pd.isna(pred) or pred < 0:
                raise ValueError("Invalid prediction from ML model")

            suggested_qty = max(math.ceil(pred * 1.2), 5)
            confidence = min(0.9, 0.3 + (len(df) * 0.05))
            reasoning = f"ML-based forecast using {len(df)} sales records. Predicted avg {pred:.2f}/day with 20% buffer."

            return ForecastResponse(suggestedQty=suggested_qty, confidence=confidence, reasoning=reasoning, itemName=item_name)

        except Exception as ml_e:
            # Log ML error and fallback to original logic
            print(f"ML failed ({ml_e}); falling back to heuristic.")
            suggested_qty, confidence, reasoning = heuristic_from_orders_for_item(orders, request.itemId, item_name)
            reasoning = f"Fallback due to ML error: {str(ml_e)}. " + reasoning
            return ForecastResponse(suggestedQty=suggested_qty, confidence=confidence, reasoning=reasoning, itemName=item_name)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in /forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Forecast calculation failed: {str(e)}")


@app.post("/forecast/store")
async def forecast_store_items(request: StoreForecastRequest):
    """
    ML-backed store-level forecasts with per-item fallback to original heuristic.
    Each forecast item includes itemName already (unchanged behavior).
    """
    try:
        # Get store items
        try:
            items_response = requests.get(f"{BACKEND_URL}/api/items/store/{request.storeId}", timeout=20)
        except requests.RequestException as e:
            print(f"Request exception fetching items: {e}")
            raise HTTPException(status_code=503, detail=f"Backend service unavailable: {str(e)}")

        if items_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch store items from backend")

        items_data = items_response.json()
        items = items_data.get("items", [])

        # Get orders for last 7 days
        seven_days_ago = datetime.now() - timedelta(days=7)
        orders_response = requests.get(
            f"{BACKEND_URL}/api/orders/ml/public",
            params={"since": seven_days_ago.isoformat()},
            timeout=20
        )

        if orders_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch orders from backend")

        orders_data = orders_response.json()
        orders = orders_data.get("orders", [])

        # Filter orders for this store
        store_orders = [order for order in orders if order.get("store", {}).get("_id") == request.storeId]

        forecasts = []

        for item in items:
            try:
                item_id = item.get("_id")
                this_item_name = item.get("name")
                # Build rows for this item
                rows = []
                for order in store_orders:
                    for order_item in order.get("items", []):
                        if order_item.get("item", {}).get("_id") == item_id:
                            rows.append({
                                "date": order.get("createdAt"),
                                "quantity": order_item.get("quantity", 0),
                                "price": order_item.get("item", {}).get("price", 0)
                            })

                # If no rows -> fallback original (pass item name)
                if not rows:
                    suggested_qty, confidence, reasoning = heuristic_from_orders_for_item(store_orders, item_id, this_item_name)
                else:
                    # Try ML
                    try:
                        df = pd.DataFrame(rows)
                        df["date"] = pd.to_datetime(df["date"], errors="coerce")
                        df = df.dropna(subset=["date"])
                        df["price"] = pd.to_numeric(df.get("price", 0), errors="coerce").fillna(0.0)
                        df["quantity"] = pd.to_numeric(df.get("quantity", 0), errors="coerce").fillna(0.0)
                        df["day_of_week"] = df["date"].dt.weekday

                        if len(df) < 2:
                            raise ValueError("Insufficient data for ML")

                        X = df[["day_of_week", "price"]].values
                        y = df["quantity"].values

                        model = LinearRegression()
                        model.fit(X, y)

                        today = pd.Timestamp.now().weekday()
                        avg_price = float(df["price"].mean()) if len(df) > 0 else 0.0
                        pred = model.predict([[today, avg_price]])[0]

                        if pd.isna(pred) or pred < 0:
                            raise ValueError("Invalid prediction from ML model")

                        suggested_qty = max(math.ceil(pred * 1.2), 5)
                        confidence = min(0.9, 0.3 + (len(df) * 0.05))
                        reasoning = f"ML-based forecast using {len(df)} sales records. Predicted avg {pred:.2f}/day with 20% buffer."

                    except Exception as ml_e:
                        print(f"ML failed for item {item_id}: {ml_e}; falling back.")
                        suggested_qty, confidence, reasoning = heuristic_from_orders_for_item(store_orders, item_id, this_item_name)
                        reasoning = f"Fallback due to ML error: {str(ml_e)}. " + reasoning

                forecasts.append({
                    "itemId": item_id,
                    "itemName": this_item_name,
                    "currentQty": item.get("quantity"),
                    "reorderThreshold": item.get("reorderThreshold"),
                    "suggestedQty": suggested_qty,
                    "confidence": confidence,
                    "reasoning": reasoning
                })

            except Exception as e:
                # Continue with other items if one fails
                print(f"Item forecast failed for {item.get('_id')}: {e}")
                forecasts.append({
                    "itemId": item.get("_id"),
                    "itemName": item.get("name"),
                    "currentQty": item.get("quantity"),
                    "reorderThreshold": item.get("reorderThreshold"),
                    "suggestedQty": 0,
                    "confidence": 0,
                    "reasoning": f"Forecast failed: {str(e)}"
                })

        return {
            "storeId": request.storeId,
            "forecasts": forecasts,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in /forecast/store: {e}")
        raise HTTPException(status_code=500, detail=f"Store forecast calculation failed: {str(e)}")


@app.post("/test-forecast", response_model=ForecastResponse)
async def test_forecast_item(request: ForecastRequest):
    """
    Test forecast endpoint that doesn't call the backend.
    """
    try:
        total_sold = 15
        average_daily_sales = total_sold / 7

        suggested_qty = math.ceil(average_daily_sales * 1.2)
        suggested_qty = max(suggested_qty, 5)

        confidence = 0.8
        reasoning = f"Test forecast: Based on {total_sold} units sold in the last 7 days ({average_daily_sales:.1f} daily average). Suggested quantity includes 20% buffer."

        # Return a test itemName if you want to validate UI behavior
        return ForecastResponse(
            suggestedQty=suggested_qty,
            confidence=confidence,
            reasoning=reasoning,
            itemName="Test Item"
        )

    except Exception as e:
        print(f"Test forecast exception: {e}")
        raise HTTPException(status_code=500, detail=f"Test forecast failed: {str(e)}")


@app.get("/")
async def root():
    return {
        "message": "Fast-Commerce ML Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "forecast": "/forecast",
            "store_forecast": "/forecast/store"
        }
    }
