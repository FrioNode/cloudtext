import Image from 'next/image'
import Link from 'next/link'

export default function BrandLink({ href }: { href: string }) {
  return (
    <Link className='flex items-center space-x-2' href={href}>
      <Image
        src='/images/logo.png'
        alt='Cloudtext.online logo'
        width={24}
        height={24}
        className='h-6 w-6 rounded-full bg-white'
      />
      <span className='font-bold'>
        Cloud<span className='text-primary'>text</span>
        <span className='align-center text-xs text-muted-foreground'>
          .online
        </span>
      </span>
    </Link>
  )
}