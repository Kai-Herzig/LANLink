// migrate-users.js
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  let migrated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = doc.id;
    const adminFields = {};
    if ('isAdmin' in data) adminFields.isAdmin = data.isAdmin;
    if ('approved' in data) adminFields.approved = data.approved;
    // Only migrate if at least one field exists
    if (Object.keys(adminFields).length > 0) {
      await db.collection('adminData').doc(uid).set(adminFields, { merge: true });
      // Remove fields from users/{uid}
      const update = {};
      if ('isAdmin' in data) update.isAdmin = admin.firestore.FieldValue.delete();
      if ('approved' in data) update.approved = admin.firestore.FieldValue.delete();
      await usersRef.doc(uid).update(update);
      migrated++;
      console.log(`Migrated user ${uid}:`, adminFields);
    }
  }
  console.log(`Migration complete. Migrated ${migrated} users.`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});