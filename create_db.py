import sqlite3

connection = sqlite3.connect("warehouse.db")
cursor = connection.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        supplier TEXT
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS user (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL
    )
""")

sample_data = [
    ("Basketball", "Balls", 45, 29.99, "SportsCo"),
    ("Soccer Ball", "Balls", 60, 24.99, "KickGear"),
    ("Tennis Racket", "Rackets", 30, 89.99, "RacketPro"),
    ("Yoga Mat", "Fitness", 100, 19.99, "FitSupply"),
    ("Running Shoes", "Footwear", 75, 109.99, "StrideTech"),
    ("Baseball Glove", "Accessories", 40, 49.99, "SportsCo"),
    ("Dumbbells 10lb", "Weights", 50, 34.99, "IronWorks"),
    ("Swimming Goggles", "Aquatics", 80, 14.99, "AquaGear"),
    ("Hockey Stick", "Sticks", 25, 69.99, "IceForce"),
    ("Jump Rope", "Fitness", 90, 9.99, "FitSupply"),
]

cursor.executemany("""
    INSERT INTO inventory (product_name, category, quantity, price, supplier)
    VALUES (?, ?, ?, ?, ?)
""", sample_data)

connection.commit()

# Verify the data
cursor.execute("SELECT * FROM inventory")
rows = cursor.fetchall()

print(f"{'ID':<5} {'Product':<20} {'Category':<15} {'Qty':<6} {'Price':<10} {'Supplier'}")
print("-" * 70)
for row in rows:
    print(f"{row[0]:<5} {row[1]:<20} {row[2]:<15} {row[3]:<6} ${row[4]:<9.2f} {row[5]}")

connection.close()
