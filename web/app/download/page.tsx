import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Download, ArrowDownToLine, Tag, Github, Info, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Direct download for the current release. Other releases are intentionally
// hidden — update these constants when publishing a new APK.
const APK_DOWNLOAD_URL =
  'https://github.com/FrioNode/textbee/releases/download/android_apk/Cloud_Text_v1.apk'
const GITHUB_REPO_URL = 'https://github.com/FrioNode/textbee'
const APP_VERSION = 'v1'

export default function DownloadPage() {
  return (
    <div className='min-h-screen py-16 px-4'>
      <div className='container mx-auto max-w-5xl'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center rounded-full border px-3 py-1 text-sm bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 mb-4'>
            <Download className='h-3.5 w-3.5 mr-2' /> Download textbee
          </div>
          <h1 className='text-4xl font-bold tracking-tight text-foreground'>
            Download textbee App
          </h1>
          <p className='mt-4 text-xl text-muted-foreground max-w-2xl mx-auto'>
            Transform your Android device into a powerful SMS gateway with our
            easy-to-use application.
          </p>
        </div>

        {/* Latest release section */}
        <div className='mb-16'>
          <div className='bg-card rounded-xl shadow-lg border border-border overflow-hidden'>
            <div className='p-6 sm:p-8'>
              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6'>
                <div>
                  <div className='flex items-center gap-2 mb-2'>
                    <Badge className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-100'>
                      Latest Version
                    </Badge>
                  </div>
                  <h2 className='text-2xl font-bold text-foreground'>
                    textbee App
                  </h2>
                </div>

                <Button
                  size='lg'
                  className='bg-brand-600 hover:bg-brand-700 text-white'
                  asChild
                >
                  <Link
                    href={APK_DOWNLOAD_URL}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <ArrowDownToLine className='mr-2 h-5 w-5' />
                    Download Now
                  </Link>
                </Button>
              </div>

              <div className='flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground'>
                <div className='flex items-center'>
                  <Tag className='h-4 w-4 mr-1' />
                  <span>Version: {APP_VERSION}</span>
                </div>
              </div>

              <div className='mt-6 pt-6 border-t border-border'>
                <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                  <Button variant='outline' size='sm' asChild>
                    <Link
                      href={GITHUB_REPO_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <Github className='mr-2 h-4 w-4' />
                      View on GitHub
                    </Link>
                  </Button>
                  <div className='text-sm text-muted-foreground'>
                    Compatible with Android 7.0+ devices.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements section */}
        <div className='mt-16 bg-gray-50 dark:bg-gray-900 rounded-xl p-6 sm:p-8 border border-border'>
          <div className='flex items-start'>
            <Info className='h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0' />
            <div>
              <h3 className='text-lg font-semibold text-foreground mb-2'>
                System Requirements
              </h3>
              <ul className='space-y-2 text-muted-foreground'>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>Android 7.0 (Nougat) or higher</span>
                </li>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>SMS capability on the Android device</span>
                </li>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>Internet connection for API communication</span>
                </li>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>
                    Battery optimization disabled for background operation
                    (recommended)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
