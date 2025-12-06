// Debug script to check flow execution states and contact history
const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'

async function debugFlowIssues() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB\n')

    const db = client.db()

    // Check flow executions by status
    const executions = db.collection('flowexecutions')
    const statuses = await executions
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray()

    console.log('📊 Flow Execution Status Summary:')
    statuses.forEach((s) => {
      console.log(`  - ${s._id || 'null'}: ${s.count}`)
    })

    // Get recent executions
    const recentExecs = await executions.find().sort({ startedAt: -1 }).limit(10).toArray()

    console.log('\n📝 Recent 10 Flow Executions:')
    for (const exec of recentExecs) {
      const age = Date.now() - new Date(exec.startedAt).getTime()
      const ageMinutes = Math.floor(age / 60000)
      console.log(
        `  - Status: ${exec.status}, Age: ${ageMinutes}m, Flow: ${exec.flowId.toString().substring(0, 8)}...`,
      )
      if (exec.error) {
        console.log(`    Error: ${exec.error.substring(0, 80)}`)
      }
    }

    // Check for any executions in error state
    const errorCount = await executions.countDocuments({ status: 'failed' })
    console.log(`\n❌ Failed executions: ${errorCount}`)

    // Check contacts
    const contacts = db.collection('contacts')
    const contactCount = await contacts.countDocuments()
    console.log(`\n👥 Total contacts: ${contactCount}`)

    const recentContacts = await contacts.find().sort({ createdAt: -1 }).limit(5).toArray()

    console.log('\n📱 Recent 5 Contacts:')
    recentContacts.forEach((c) => {
      console.log(`  - ${c.phoneNumber} (${c.name || 'Unknown'})`)
    })
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

console.log('🔍 Flow Execution Debug Tool')
console.log('============================\n')
debugFlowIssues()
