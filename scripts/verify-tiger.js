import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { openDatabase } from '../server/db.js';
import { ReceiptRepository } from '../server/repository.js';
import { disposeModel } from '../server/embeddings.js';

// Run only against the dedicated Tiger database configured in the ignored .env.
// This leaves one archived synthetic proof record; it never modifies user records.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. No connection attempted and no success report written.');
  process.exitCode = 2;
} else if (!isTigerUrl(process.env.DATABASE_URL)) {
  console.error('Expected a Tiger Cloud PostgreSQL URL. No connection attempted.');
  process.exitCode = 2;
} else {
  let connection;
  const id = randomUUID();
  const invoice = `TIGER-VERIFY-${id}`;
  const checks = {};
  try {
    connection = await openDatabase();
    assert.equal(connection.kind, 'tiger-cloud', 'Expected a Tiger Cloud hostname');
    const ssl = await connection.db.query('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
    assert.equal(ssl.rows[0]?.ssl, true, 'A TLS connection is required');
    checks.tls = true;
    const extension = await connection.db.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
    assert.ok(extension.rows[0]?.extversion, 'pgvector must be available');
    checks.pgvectorVersion = extension.rows[0].extversion;
    let repo = new ReceiptRepository(connection.db);
    const input = { title: 'Tiger verification washing machine', category: 'Appliances', merchant: 'Synthetic Verification Store', receiptText: `SYNTHETIC VERIFICATION ONLY - NOT A REAL PURCHASE\nInvoice: ${invoice}\nFront-load washing machine.\nNo purchase or warranty date stated.`, checked: true };
    await repo.save(input, { id });
    checks.saved = true;
    assert.equal((await repo.search(invoice)).results[0]?.id, id);
    checks.exactInvoice = true;
    const embedding = await connection.db.query('SELECT vector_dims(embedding) AS dimensions FROM chunks WHERE document_id = $1', [id]);
    assert.ok(embedding.rows.length > 0 && embedding.rows.every(row => row.dimensions === 384));
    checks.stored384DimensionalVectors = true;
    assert.ok((await repo.search(input.title, { mode: 'vector' })).results.some(row => row.id === id));
    checks.vectorSearch = true;
    await connection.db.close(); connection = null;
    connection = await openDatabase(); repo = new ReceiptRepository(connection.db);
    assert.equal((await repo.detail(id))?.receiptText, input.receiptText);
    checks.reconnectPersistence = true;
    await repo.archive(id, true);
    assert.ok(!(await repo.search(invoice)).results.some(row => row.id === id));
    checks.archivedExcluded = true;
    await repo.archive(id, false);
    assert.equal((await repo.search(invoice)).results[0]?.id, id);
    checks.undo = true;
    await repo.archive(id, true);
    const report = { verifiedAt: new Date().toISOString(), backend: connection.kind, data: 'Synthetic verification receipt only', checks, verificationRecordId: id, finalRecordState: 'archived', note: 'This verifies the database integration. It is not a cloud performance benchmark or a test with the beneficiary.' };
    await writeFile('docs/TIGER-VERIFICATION.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    // Error messages can contain connection URLs; never print them or credentials.
    console.error(`Tiger verification did not complete (${error.name}). No success report was written.`);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.db.query('UPDATE documents SET archived = TRUE WHERE id = $1', [id]).catch(() => {});
      await connection.db.close();
    }
    await disposeModel();
  }
}

function isTigerUrl(value) {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) && /(^|\.)(timescale|tigerdata)\.(com|cloud)$/.test(url.hostname);
  } catch { return false; }
}
