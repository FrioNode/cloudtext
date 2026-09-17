import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Github,
  Menu,
  MessageSquare,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Routes } from '@/config/routes'
import { ExternalLinks } from '@/config/external-links'
import Footer from '@/components/shared/footer'
import ChatWidget from '@/components/shared/chat-widget'
import ThemeToggle from '@/components/shared/theme-toggle'
import PublicProviders from '@/components/shared/public-providers'
import BrandLink from '@/components/shared/brand-link'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'

const features = [
  {
    icon: Server,
    title: 'Your phone, your gateway',
    description: 'Route messages through an Android device you already own.',
  },
  {
    icon: MessageSquare,
    title: 'Built for developers',
    description: 'A clean API for OTPs, alerts, notifications, and two-way SMS.',
  },
  {
    icon: ShieldCheck,
    title: 'Open and transparent',
    description: 'No carrier lock-in, hidden gateway fees, or per-message markup.',
  },
]

export default function LandingPage() {
  return (
    <PublicProviders>
      <div className='min-h-screen overflow-hidden bg-background text-foreground'>
      <nav className='mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10'>
        <BrandLink href='/' />

        <div className='hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex'>
          <Link href='#features' className='transition-colors hover:text-foreground'>Features</Link>
          <Link href='#how-it-works' className='transition-colors hover:text-foreground'>How it works</Link>
          <Link href='#api' className='transition-colors hover:text-foreground'>API</Link>
          <Link href={ExternalLinks.github} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 transition-colors hover:text-foreground'>
            <Github className='h-4 w-4' /> GitHub
          </Link>
        </div>

        <div className='flex items-center gap-3'>
          <div className='w-24 sm:w-28'>
            <ThemeToggle />
          </div>
          <Link href={Routes.login} className='hidden px-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:block'>Sign in</Link>
          <Link href={Routes.register} className='rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-700'>Start sending free</Link>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type='button'
                className='rounded-lg p-2 text-muted-foreground md:hidden'
                aria-label='Open navigation'
              >
                <Menu className='h-5 w-5' />
              </button>
            </SheetTrigger>
            <SheetContent side='right' className='w-[300px] sm:w-[400px]'>
              <nav aria-label='Main' className='mt-8 flex flex-col gap-2'>
                {[
                  ['Features', '#features'],
                  ['How it works', '#how-it-works'],
                  ['API', '#api'],
                ].map(([label, href]) => (
                  <SheetClose key={href} asChild>
                    <Link
                      href={href}
                      className='rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                    >
                      {label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href={ExternalLinks.github}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                  >
                    GitHub
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href={Routes.login}
                    className='mt-2 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted'
                  >
                    Sign in
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <div className='border-y border-border bg-muted/50 px-5 py-3 text-center text-sm text-muted-foreground sm:px-8'>
        <span className='font-medium'>Open-source SMS infrastructure.</span>{' '}
        Send from your own Android device with no gateway fees.
        <Link href={Routes.quickstart} className='ml-2 font-semibold text-primary hover:underline'>See how it works <ArrowRight className='mb-0.5 inline h-3.5 w-3.5' /></Link>
      </div>

      <section className='relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:pb-24 lg:pt-24'>
        <div className='relative z-10 max-w-2xl'>
          <div className='mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 shadow-sm'>
            <Sparkles className='h-4 w-4' />
            The open-source SMS gateway
          </div>
          <h1 className='max-w-xl text-5xl font-extrabold leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-[4.8rem]'>
            Turn your Android phone into an{' '}
            <span className='text-primary'>SMS gateway.</span>
          </h1>
          <p className='mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl'>
            Send and receive SMS from your applications through your own Android device. No gateway fees, no per-message charges, and live in minutes.
          </p>
          <div className='mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
            <Link href={Routes.register} className='inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-brand-700'>
              Start sending free <ArrowRight className='h-4 w-4' />
            </Link>
            <Link href='#how-it-works' className='inline-flex items-center gap-2 px-1 py-2 font-semibold text-foreground hover:text-primary'>See how it works <ArrowRight className='h-4 w-4' /></Link>
          </div>
          <div className='mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground'>
            <span className='inline-flex items-center gap-1.5'><Check className='h-4 w-4 text-primary' /> Free to get started</span>
            <span className='inline-flex items-center gap-1.5'><Check className='h-4 w-4 text-primary' /> No credit card</span>
          </div>
        </div>

        <div className='relative flex min-h-[420px] items-center justify-center lg:min-h-[560px]'>
          <div className='absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100 blur-3xl sm:h-[500px] sm:w-[500px]' />
          <div className='absolute right-[8%] top-[18%] z-20 hidden rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xl sm:block'>
            <div className='mb-1 flex items-center gap-2 font-semibold text-foreground'><MessageSquare className='h-4 w-4 text-primary' /> SMS delivered</div>
            <span className='text-xs text-muted-foreground'>Your verification code is on its way</span>
          </div>
          <div className='absolute bottom-[14%] left-[3%] z-20 hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xl sm:flex'>
            <span className='h-2.5 w-2.5 rounded-full bg-[#35a56b]' /> Gateway online
          </div>
          <Image
            src='/images/app-screenshot.png'
            alt='Cloudtext Android app dashboard'
            width={512}
            height={512}
            priority
            className='relative z-10 h-[390px] w-auto object-contain drop-shadow-[18px_24px_20px_rgba(31,41,55,0.18)] rotate-[8deg] sm:h-[510px]'
          />
        </div>
      </section>

      <section id='features' className='border-t border-border bg-card px-5 py-14 sm:px-8 lg:px-10'>
        <div className='mx-auto grid max-w-7xl gap-8 md:grid-cols-3'>
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className='flex gap-4'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-primary'><Icon className='h-5 w-5' /></div>
              <div><h2 className='font-bold text-foreground'>{title}</h2><p className='mt-1 text-sm leading-6 text-muted-foreground'>{description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id='how-it-works' className='mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24'>
        <div className='max-w-2xl'><p className='text-sm font-bold uppercase tracking-[0.18em] text-primary'>From phone to API</p><h2 className='mt-3 text-3xl font-bold tracking-tight sm:text-4xl'>The simplest way to own your SMS stack.</h2><p className='mt-4 text-lg leading-8 text-muted-foreground'>Install the Android app, connect your device, and start sending with a familiar REST API.</p></div>
        <div className='mt-10 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:gap-12'>
          {['Install the app', 'Connect your device', 'Send your first message'].map((step, index) => <div key={step} className='flex items-center gap-3'><span className='flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background'>{index + 1}</span><span className='font-semibold'>{step}</span></div>)}
        </div>
      </section>
      <section id='api' className='border-t border-border bg-muted/40 px-5 py-16 sm:px-8 lg:px-10 lg:py-20'>
        <div className='mx-auto max-w-7xl'>
          <div className='max-w-2xl'><p className='text-sm font-bold uppercase tracking-[0.18em] text-primary'>Developer API</p><h2 className='mt-3 text-3xl font-bold tracking-tight sm:text-4xl'>A small, practical API for your messaging workflows.</h2><p className='mt-4 text-lg leading-8 text-muted-foreground'>Authenticate with an <code className='rounded bg-muted px-1.5 py-0.5 text-base'>x-api-key</code> header and send SMS from your own Android device.</p></div>
          <div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {[
              ['POST', '/api/v1/gateway/send-sms'],
              ['POST', '/api/v1/gateway/send-bulk-sms'],
              ['GET', '/api/v1/gateway/messages'],
              ['POST', '/api/v1/webhooks'],
            ].map(([method, path]) => <div key={path} className='rounded-lg border border-border bg-card p-4'><span className='text-xs font-bold text-primary'>{method}</span><code className='mt-2 block break-all text-sm text-foreground'>{path}</code></div>)}
          </div>
          <Link href='https://cloudtextapi.frionode.online/' target='_blank' rel='noopener noreferrer' className='mt-8 inline-flex items-center gap-2 font-semibold text-primary hover:underline'>Read the full API documentation <ArrowRight className='h-4 w-4' /></Link>
        </div>
      </section>
      <Footer />
      </div>
      <ChatWidget />
    </PublicProviders>
  )
}