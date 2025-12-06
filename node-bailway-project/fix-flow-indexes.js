// Run this script once to fix the duplicate key error on sessionId
// This drops the old unique index and ensures only the sparse index exists

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'

async function fixFlowIndexes() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    console.log('Database URI:', MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')) // Hide credentials

    const db = client.db()
    const collection = db.collection('flows')

    // Check if collection exists
    const collections = await db.listCollections({ name: 'flows' }).toArray()

    if (collections.length === 0) {
      console.log('\n⚠️  Collection "flows" does not exist yet.')
      console.log(
        '✅ This is OK! The collection will be created with the correct index on first flow save.',
      )
      console.log('✅ No action needed - the duplicate key error should not occur.')
      return
    }

    console.log('\n✅ Collection "flows" exists. Checking indexes...')

    // Get all indexes
    const indexes = await collection.indexes()
    console.log('\nCurrent indexes:')
    indexes.forEach((idx) => {
      console.log(
        `  - ${idx.name}:`,
        JSON.stringify(idx.key),
        idx.unique ? '(UNIQUE)' : '(NON-UNIQUE)',
      )
    })

    // Check if problematic unique index exists
    const hasUniqueSessionId = indexes.some(
      (idx) => idx.name === 'sessionId_1' && idx.unique === true,
    )

    if (hasUniqueSessionId) {
      console.log('\n⚠️  Found UNIQUE index on sessionId - this causes the duplicate key error!')
      console.log('Dropping the old unique index...')

      try {
        await collection.dropIndex('sessionId_1')
        console.log('✅ Dropped old sessionId_1 unique index')
      } catch (error) {
        console.error('❌ Error dropping index:', error.message)
        throw error
      }

      // Recreate as sparse non-unique index
      console.log('Creating new sparse (non-unique) index...')
      await collection.createIndex(
        { sessionId: 1 },
        { sparse: true, unique: false, name: 'sessionId_1' },
      )
      console.log('✅ Created new sparse index on sessionId')
    } else {
      console.log('\n✅ No problematic unique index found.')
      console.log('✅ Index configuration looks correct!')
    }

    // Show final indexes
    const finalIndexes = await collection.indexes()
    console.log('\nFinal indexes:')
    finalIndexes.forEach((idx) => {
      console.log(
        `  - ${idx.name}:`,
        JSON.stringify(idx.key),
        idx.unique ? '(UNIQUE)' : '(NON-UNIQUE)',
        idx.sparse ? '(SPARSE)' : '',
      )
    })

    console.log('\n✅ Index fix complete! You can now create flows without duplicate key errors.')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

console.log('🔧 MongoDB Flow Index Fixer')
console.log('===========================\n')
fixFlowIndexes()
