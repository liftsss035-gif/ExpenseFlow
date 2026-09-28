from flask import Flask, jsonify, request
from flask_cors import CORS

from database import create_database, get_connection

app = Flask(__name__)
CORS(app)

create_database()


@app.route("/")
def home():
    return "Expense Tracker Backend is Working!"


# =========================
# TRANSACTIONS
# =========================

@app.route("/api/transactions", methods=["GET"])
def get_transactions():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM transactions
        ORDER BY date DESC, id DESC
    """)

    rows = cursor.fetchall()
    connection.close()

    transactions = []

    for row in rows:
        transactions.append({
            "id": row["id"],
            "transaction_type": row["transaction_type"],
            "amount": row["amount"],
            "category": row["category"],
            "description": row["description"] or "",
            "date": row["date"],
            "payment_method": row["payment_method"] or ""
        })

    return jsonify(transactions)


@app.route("/api/transactions", methods=["POST"])
def add_transaction():

    data = request.get_json() or {}

    transaction_type = data.get("transaction_type")
    amount = data.get("amount")
    category = data.get("category")
    description = data.get("description", "")
    date = data.get("date")
    payment_method = data.get("payment_method", "")

    if transaction_type not in ["income", "expense"]:
        return jsonify({"error": "Invalid transaction type"}), 400

    try:
        amount = float(amount)
    except:
        return jsonify({"error": "Invalid amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    if not category:
        return jsonify({"error": "Category is required"}), 400

    if not date:
        return jsonify({"error": "Date is required"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO transactions
        (
            transaction_type,
            amount,
            category,
            description,
            date,
            payment_method
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        transaction_type,
        amount,
        category,
        description,
        date,
        payment_method
    ))

    connection.commit()
    transaction_id = cursor.lastrowid
    connection.close()

    return jsonify({
        "message": "Transaction added successfully",
        "id": transaction_id
    }), 201


@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM transactions WHERE id = ?",
        (transaction_id,)
    )

    deleted = cursor.rowcount

    connection.commit()
    connection.close()

    if deleted == 0:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify({
        "message": "Transaction deleted successfully"
    })


# =========================
# BUDGETS
# =========================

@app.route("/api/budgets", methods=["GET"])
def get_budgets():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM budgets
        ORDER BY category
    """)

    rows = cursor.fetchall()
    connection.close()

    budgets = []

    for row in rows:
        budgets.append({
            "id": row["id"],
            "category": row["category"],
            "amount": row["amount"]
        })

    return jsonify(budgets)


@app.route("/api/budgets", methods=["POST"])
def save_budget():

    data = request.get_json() or {}

    category = data.get("category")
    amount = data.get("amount")

    if not category:
        return jsonify({"error": "Category is required"}), 400

    try:
        amount = float(amount)
    except:
        return jsonify({"error": "Invalid budget amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Budget must be greater than zero"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO budgets (category, amount)
        VALUES (?, ?)
        ON CONFLICT(category)
        DO UPDATE SET amount = excluded.amount
    """, (category, amount))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Budget saved successfully"
    })


@app.route("/api/budgets/<int:budget_id>", methods=["DELETE"])
def delete_budget(budget_id):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM budgets WHERE id = ?",
        (budget_id,)
    )

    deleted = cursor.rowcount

    connection.commit()
    connection.close()

    if deleted == 0:
        return jsonify({"error": "Budget not found"}), 404

    return jsonify({
        "message": "Budget deleted successfully"
    })


if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )