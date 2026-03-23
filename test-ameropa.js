import mysql from "mysql2/promise";

const { AMEROPA_DB_HOST, AMEROPA_DB_USER, AMEROPA_DB_PASS, AMEROPA_DB_NAME } = process.env;

let connection;
try {
  connection = await mysql.createConnection({
    host:     AMEROPA_DB_HOST,
    user:     AMEROPA_DB_USER,
    password: AMEROPA_DB_PASS,
    database: AMEROPA_DB_NAME,
    connectTimeout: 10000,
  });

  console.log("✅ Conectat cu succes la MySQL Ameropa!");

  const [rows] = await connection.execute("SHOW TABLES");
  if (rows.length === 0) {
    console.log("   (nicio tabelă găsită în baza de date)");
  } else {
    console.log(`\n   Tabele în "${AMEROPA_DB_NAME}":`);
    rows.forEach((row) => console.log("   -", Object.values(row)[0]));
  }
} catch (err) {
  console.error("❌ Conexiune eșuată:", err.message);
} finally {
  if (connection) await connection.end();
}
