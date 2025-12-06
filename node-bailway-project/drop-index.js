// Script to drop the old unique index on sessionId from the flows collection
// Run this once to clean up the database

const mongoose = require('mongoose')

const DATABASE_URI =
  process.env.DATABASE_URI ||
  'mongodb+srv://claudeai446_db_user:YK6JrnowE4Mzc2fQ.4LHC7dJtWSh4JI4IReC3Z_fanYimLkNmgjtmxdEr2'

async function dropIndex() {
  try {
    await mongoose.connect(DATABASE_URI)
    console.log('Connected to MongoDB')

    const db = mongoose.connection.db
    const collection = db.collection('flows')

    // Drop the unique index on sessionId
    try {
      await collection.dropIndex('sessionId_1')
      console.log('✓ Successfully dropped sessionId_1 index')
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('Index sessionId_1 not found, already dropped or never existed')
      } else {
        throw error
      }
    }

    console.log('\nCurrent indexes:')
    const indexes = await collection.indexes()
    console.log(JSON.stringify(indexes, null, 2))

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

dropIndex()
