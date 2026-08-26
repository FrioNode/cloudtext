'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { markDiscordJoined } from '@/lib/discord-community'
import { ExternalLinks } from '@/config/external-links'
import Link from 'next/link'

export default function CommunitySupportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Get help from the community</CardTitle>
        <CardDescription>
          Ask questions and get answers from other textbee users and the team on
          our Discord server. It is often the fastest way to get unblocked.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant='outline'>
          <Link
            href={ExternalLinks.discord}
            prefetch={false}
            target='_blank'
            rel='noopener noreferrer'
            onClick={markDiscordJoined}
          >
            <MessageSquare className='mr-2 h-4 w-4' />
            Join the Discord
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
