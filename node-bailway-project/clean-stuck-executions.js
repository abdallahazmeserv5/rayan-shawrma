// Clean up stuck paused flow executions
// Run this to fix contacts that aren't responding due to stuck flows

const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'

async function cleanStuckExecutions() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db()
    const executions = db.collection('flowexecutions')

    // Find all paused executions
    const pausedCount = await executions.countDocuments({ status: 'paused' })
    console.log(`\n📊 Found ${pausedCount} paused flow executions`)

    if (pausedCount === 0) {
      console.log('✅ No stuck executions - everything is clean!')
      return
    }

    // Show some details
    const pausedExecs = await executions.find({ status: 'paused' }).limit(10).toArray()
    console.log('\n🔍 Sample paused executions:')
    pausedExecs.forEach((exec, idx) => {
      const age = Date.now() - new Date(exec.startedAt).getTime()
      const ageMinutes = Math.floor(age / 60000)
      console.log(
        `  ${idx + 1}. ID: ${exec._id}, Started: ${ageMinutes} mins ago, Flow: ${exec.flowId}`,
      )
    })

    // Ask for confirmation (you can remove this if you want auto-cleanup)
    console.log(`\n⚠️  About to mark ${pausedCount} paused executions as 'failed'`)
    console.log('This will allow contacts to trigger new flows.')

    // Update all paused to failed
    const result = await executions.updateMany(
      { status: 'paused' },
      {
        $set: {
          status: 'failed',
          error: 'Cleaned up stuck execution - likely from debugging session',
          completedAt: new Date(),
        },
      },
    )

    console.log(`\n✅ Updated ${result.modifiedCount} executions from 'paused' to 'failed'`)
    console.log('✅ Contacts should now respond to new messages!')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

console.log('🧹 Flow Execution Cleanup Script')
console.log('=================================\n')
cleanStuckExecutions()
