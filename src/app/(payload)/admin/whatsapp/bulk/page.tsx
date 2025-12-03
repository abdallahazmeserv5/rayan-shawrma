'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Upload, Download, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Session {
  sessionId: string
  status: string
}

export default function BulkMessagePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState('')
  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{
    sent: number
    failed: number
    total: number
  } | null>(null)
  const [results, setResults] = useState<any>(null)

  // Batch Mode State
  const [batchMode, setBatchMode] = useState(false)
  const [batchSize, setBatchSize] = useState(1000)
  const [batchDelay, setBatchDelay] = useState(1) // in minutes
  const [currentBatch, setCurrentBatch] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [nextBatchTime, setNextBatchTime] = useState<Date | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`)
      const data = await response.json()
      setSessions(data.sessions || [])
      const connected = data.sessions?.find((s: Session) => s.status === 'connected')
      if (connected) {
        setSelectedSession(connected.sessionId)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      toast.error('Failed to fetch sessions')
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      let extractedNumbers: string[] = []

      if (file.name.endsWith('.csv')) {
        extractedNumbers = text
          .split('\n')
          .flatMap((line) => line.split(','))
          .map((cell) => cell.trim().replace(/['"]/g, ''))
          .filter((cell) => /^\d+$/.test(cell))
      } else if (file.name.endsWith('.txt')) {
        extractedNumbers = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => /^\d+$/.test(line))
      } else {
        toast.error('Unsupported file type. Please use .csv or .txt files.')
        return
      }

      if (extractedNumbers.length === 0) {
        toast.error('No valid phone numbers found in the file.')
        return
      }

      setNumbers(extractedNumbers.join('\n'))
      toast.success(`Imported ${extractedNumbers.length} numbers from ${file.name}`)
      e.target.value = ''
    } catch (error: any) {
      toast.error(`Error importing file: ${error.message}`)
    }
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSession || !numbers || !message) {
      toast.error('Please fill in all fields')
      return
    }

    const numberList = numbers
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)

    if (numberList.length === 0) {
      toast.error('Please enter at least one phone number')
      return
    }

    setLoading(true)
    setResults(null)
    setCurrentBatch(0)
    setNextBatchTime(null)

    // Initialize progress
    const initialProgress = { sent: 0, failed: 0, total: numberList.length }
    setProgress(initialProgress)

    try {
      if (batchMode) {
        // BATCH MODE LOGIC
        const batches = []
        for (let i = 0; i < numberList.length; i += batchSize) {
          batches.push(numberList.slice(i, i + batchSize))
        }

        setTotalBatches(batches.length)

        const cumulativeResults = {
          sent: 0,
          failed: 0,
          results: [] as any[],
          errors: [] as any[],
        }

        for (let i = 0; i < batches.length; i++) {
          setCurrentBatch(i + 1)
          const batchNumbers = batches[i]

          // Send current batch
          const response = await fetch(`${WHATSAPP_SERVICE_URL}/message/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: selectedSession,
              numbers: batchNumbers,
              message,
            }),
          })
          const result = await response.json()

          // Update cumulative results
          cumulativeResults.sent += result.sent
          cumulativeResults.failed += result.failed
          cumulativeResults.results = [...cumulativeResults.results, ...result.results]
          cumulativeResults.errors = [...cumulativeResults.errors, ...result.errors]

          // Update UI
          setProgress({
            sent: cumulativeResults.sent,
            failed: cumulativeResults.failed,
            total: numberList.length,
          })
          setResults({ ...cumulativeResults })

          // Wait for delay if not the last batch
          if (i < batches.length - 1) {
            const delayMs = batchDelay * 60 * 1000
            const nextTime = new Date(Date.now() + delayMs)
            setNextBatchTime(nextTime)
            await sleep(delayMs)
            setNextBatchTime(null)
          }
        }
        toast.success('All batches completed!')
      } else {
        // NORMAL MODE (All at once)
        const response = await fetch(`${WHATSAPP_SERVICE_URL}/message/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: selectedSession,
            numbers: numberList,
            message,
          }),
        })
        const result = await response.json()

        setProgress({
          sent: result.sent,
          failed: result.failed,
          total: numberList.length,
        })
        setResults(result)
        toast.success('Bulk send complete!')
      }
    } catch (error: any) {
      console.error('Error during send:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
      setNextBatchTime(null)
    }
  }

  const connectedSessions = sessions.filter((s) => s.status === 'connected')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Messaging</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send messages to thousands of contacts in parallel
        </p>
      </div>

      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Maximum Throughput Mode</AlertTitle>
        <AlertDescription className="text-yellow-700">
          This system fires ALL messages SIMULTANEOUSLY. No throttling or delays - instant firing.
          Continues on error.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSend} className="space-y-6">
            {/* Session Selection */}
            <div className="space-y-2">
              <Label>Select Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                <SelectContent>
                  {connectedSessions.map((session) => (
                    <SelectItem key={session.sessionId} value={session.sessionId}>
                      {session.sessionId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Mode Settings */}
            <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="batch-mode"
                  checked={batchMode}
                  onCheckedChange={(checked) => setBatchMode(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="batch-mode" className="font-medium text-gray-900">
                  Enable Batch Mode (Recommended for 10k+ numbers)
                </Label>
              </div>

              {batchMode && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      min="100"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">Numbers per batch</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Delay (Minutes)</Label>
                    <Input
                      type="number"
                      value={batchDelay}
                      onChange={(e) => setBatchDelay(Number(e.target.value))}
                      min="1"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">Wait time between batches</p>
                  </div>
                </div>
              )}
            </div>

            {/* Phone Numbers */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Phone Numbers (one per line)</Label>
                <div>
                  <Input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-import"
                    disabled={loading}
                  />
                  <Label
                    htmlFor="file-import"
                    className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    Import from File (CSV/TXT)
                  </Label>
                </div>
              </div>
              <Textarea
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                rows={10}
                className="font-mono"
                placeholder="201012345678&#10;201087654321"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                {numbers.split('\n').filter((n) => n.trim()).length} number(s)
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your message here..."
                disabled={loading}
              />
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={loading || !selectedSession || !numbers || !message}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {batchMode
                    ? nextBatchTime
                      ? 'Waiting for next batch...'
                      : `Sending Batch ${currentBatch}/${totalBatches}...`
                    : 'Sending...'}
                </>
              ) : (
                'Send Bulk Messages'
              )}
            </Button>
          </form>

          {/* Progress */}
          {progress && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-blue-900">Progress</h3>
                {batchMode && loading && (
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Batch {currentBatch}/{totalBatches}
                  </span>
                )}
              </div>

              {nextBatchTime && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-center animate-pulse">
                  <span className="mr-2">⏳</span>
                  Waiting for next batch. Resuming at {nextBatchTime.toLocaleTimeString()}...
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{progress.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">✓ Sent:</span>
                  <span className="font-medium text-green-600">{progress.sent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">✗ Failed:</span>
                  <span className="font-medium text-red-600">{progress.failed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${((progress.sent + progress.failed) / progress.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-green-50 rounded-md border border-green-200">
                <h3 className="text-sm font-medium text-green-900 mb-4">✅ Bulk Send Complete!</h3>
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Total Sent</p>
                    <p className="text-2xl font-bold text-green-600">{results.sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Failed</p>
                    <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {((results.sent / (results.sent + results.failed)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                    onClick={() => {
                      const successful = results.results
                        .filter((r: any) => r.status === 'success')
                        .map((r: any) => r.number)
                      const csv = successful.join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `successful_numbers_${Date.now()}.csv`
                      a.click()
                    }}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Successful ({results.sent})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                    onClick={() => {
                      const failed = results.results
                        .filter((r: any) => r.status === 'failed')
                        .map((r: any) => `${r.number},${r.error}`)
                      const csv = 'Number,Error\n' + failed.join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `failed_numbers_${Date.now()}.csv`
                      a.click()
                    }}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Failed ({results.failed})
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
