import { lazy, Suspense } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { Header } from '@/components/site/Header'
import { Footer } from '@/components/site/Footer'
import { Container } from '@/components/ui/primitives'
import { AdminShell } from '@/components/admin/AdminShell'
import { RequireRole } from '@/components/RequireRole'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/store/auth'
import { api } from '@/lib/api'
import Home from '@/pages/Home'

// Everything except the landing page loads on demand, so a customer's first
// visit doesn't download the admin charts (recharts) or the map (leaflet).
const Menu = lazy(() => import('@/pages/Menu'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const Track = lazy(() => import('@/pages/Track'))
const TrackLookup = lazy(() => import('@/pages/TrackLookup'))
const Privacy = lazy(() =>
  import('@/pages/Legal').then((m) => ({ default: m.Privacy })),
)
const Terms = lazy(() =>
  import('@/pages/Legal').then((m) => ({ default: m.Terms })),
)
const LoginHub = lazy(() => import('@/pages/Login'))
const StaffLogin = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.StaffLogin })),
)
const Kitchen = lazy(() => import('@/pages/Kitchen'))
const Driver = lazy(() => import('@/pages/Driver'))
const LiveOrders = lazy(() => import('@/pages/admin/LiveOrders'))
const History = lazy(() => import('@/pages/admin/History'))
const MenuAdmin = lazy(() => import('@/pages/admin/MenuAdmin'))
const Settings = lazy(() => import('@/pages/admin/Settings'))
const Drivers = lazy(() => import('@/pages/admin/Drivers'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

/** Public pages carry the site header and footer. */
function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

/**
 * Checkout and tracking deliberately drop the site chrome — both designs use a
 * stripped header so nothing competes with completing or reading the order.
 */
function FocusLayout() {
  return (
    <main className="min-h-dvh">
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </main>
  )
}

/** Feeds the sidebar's live-order badge. */
function AdminLayout() {
  const { data } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: api.orders.all,
    refetchInterval: 30_000,
  })
  const live = (data?.orders ?? []).filter((o) => o.status === 'placed').length
  return <AdminShell liveCount={live} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/track" element={<TrackLookup />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route element={<FocusLayout />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track/:orderNumber" element={<Track />} />
                <Route path="/login" element={<LoginHub />} />
                <Route
                  path="/admin/login"
                  element={<StaffLogin role="admin" />}
                />
                <Route
                  path="/kitchen/login"
                  element={<StaffLogin role="chef" />}
                />
                <Route
                  path="/driver/login"
                  element={<StaffLogin role="driver" />}
                />

                {/* Kitchen display — chef, and admin for oversight. */}
                <Route
                  element={
                    <RequireRole
                      roles={['chef', 'admin']}
                      loginPath="/kitchen/login"
                    />
                  }
                >
                  <Route path="/kitchen" element={<Kitchen />} />
                </Route>

                {/* Driver screen — only the orders assigned to this driver. */}
                <Route
                  element={
                    <RequireRole roles={['driver']} loginPath="/driver/login" />
                  }
                >
                  <Route path="/driver" element={<Driver />} />
                </Route>
              </Route>

              {/* The ONE monitoring dashboard. Admin only, server-enforced. */}
              <Route
                element={
                  <RequireRole roles={['admin']} loginPath="/admin/login" />
                }
              >
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<LiveOrders />} />
                  <Route path="history" element={<History />} />
                  <Route path="menu" element={<MenuAdmin />} />
                  <Route path="drivers" element={<Drivers />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

function PageLoading() {
  return (
    <p
      className="py-32 text-center text-sm text-muted-foreground"
      role="status"
    >
      Loading…
    </p>
  )
}

function NotFound() {
  return (
    <Container className="py-32 text-center">
      <p className="eyebrow text-muted-foreground">404</p>
      <h1 className="mt-4 text-4xl">That page isn&apos;t on the menu</h1>
      <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
        The link may be old. Everything we cook today is on the menu.
      </p>
      <a
        href="/menu"
        className="mt-9 inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
      >
        Browse the menu
      </a>
    </Container>
  )
}
