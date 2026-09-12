import { Link } from 'react-router-dom'
import { BRAND } from '@shared/index'
import { Container, Eyebrow } from '@/components/ui/primitives'

const EXPLORE = [
  { label: 'Home', to: '/' },
  { label: 'Full menu', to: '/menu' },
  { label: 'About', to: '/about' },
  { label: 'Track an order', to: '/account' },
]

export function Footer() {
  return (
    <footer className="bg-forest-deep text-on-dark">
      <Container className="py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
          <div>
            <h2 className="font-display text-[30px] leading-none">{BRAND.name}</h2>
            <p className="mt-6 max-w-[300px] text-[15px] leading-relaxed text-on-dark-muted">
              {BRAND.blurb}
            </p>
          </div>

          <nav aria-label="Explore">
            <Eyebrow onDark>Explore</Eyebrow>
            <ul className="mt-6 space-y-3.5">
              {EXPLORE.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-[15px] text-on-dark/90 transition-colors duration-200 hover:text-on-dark"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Eyebrow onDark>Kitchen</Eyebrow>
            <address className="mt-6 space-y-1.5 text-[15px] not-italic text-on-dark/90">
              <p>{BRAND.address.line1}</p>
              <p>{BRAND.address.line2}</p>
              <p>
                <a
                  href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
                  className="transition-colors duration-200 hover:text-on-dark"
                >
                  {BRAND.phone}
                </a>
              </p>
            </address>
          </div>

          <div>
            <Eyebrow onDark>Delivery</Eyebrow>
            <div className="mt-6 space-y-1.5 text-[15px] text-on-dark/90">
              <p>{BRAND.hours}</p>
              <p>{BRAND.deliveryAreas.join(' · ')}</p>
              <p>
                <a
                  href={`https://instagram.com/${BRAND.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-terracotta transition-opacity duration-200 hover:opacity-80"
                >
                  {BRAND.instagram}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-on-dark-border pt-8 text-[13px] text-on-dark-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.legalName}</p>
          <p>Cash on delivery only · FSSAI {BRAND.fssai}</p>
        </div>
      </Container>
    </footer>
  )
}
