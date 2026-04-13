'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Props {
  createToken: (label: string) => Promise<string>
}

export function TokenCreateDialog({ createToken }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!label.trim()) {
      return
    }

    setLoading(true)
    try {
      const raw = await createToken(label.trim())
      setToken(raw)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!token) {
      return
    }

    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenChange(next: boolean) {
    if (!next && token) {
      router.refresh()
    }

    if (!next) {
      setLabel('')
      setToken(null)
      setCopied(false)
    }

    setOpen(next)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size='sm'>Create token</Button>
      </DialogTrigger>

      <DialogContent showCloseButton={!!token}>
        {token ? (
          <>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
              <DialogDescription>
                Copy this token now — it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className='flex flex-col gap-2'>
              <div
                className={cn(
                  'select-all break-all rounded-xl border border-border',
                  'bg-muted px-3 py-2 font-mono text-sm'
                )}
              >
                {token}
              </div>
              <Button onClick={copy} type='button' variant='outline'>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </Button>
            </div>

            <DialogFooter showCloseButton />
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New token</DialogTitle>
              <DialogDescription>
                Give this token a name to identify where it&apos;s used.
              </DialogDescription>
            </DialogHeader>

            <input
              autoFocus
              className={cn(
                'mt-4 w-full rounded-xl border border-input bg-background',
                'px-3 py-2 text-sm outline-none placeholder:text-muted-foreground',
                'focus-visible:ring-2 focus-visible:ring-ring'
              )}
              maxLength={100}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. Claude Desktop'
              required
              value={label}
            />

            <DialogFooter className='mt-4'>
              <Button
                onClick={() => handleOpenChange(false)}
                type='button'
                variant='outline'
              >
                Cancel
              </Button>
              <Button disabled={loading} type='submit'>
                {loading ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
