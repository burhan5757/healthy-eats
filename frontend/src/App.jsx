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
import { AuthProvider } from '@/store/auth'
import { api } from '@/lib/api'
import Home from '@/pages/Home'
import Menu from '@/pages/Menu'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Checkout from '@/pages/Checkout'
import Track from '@/pages/Track'
import Login from '@/pages/Login'
import Kitchen from '@/pages/Kitchen'
import LiveOrders from '@/pages/admin/LiveOrders'
import History from '@/pages/admin/History'
import MenuAdmin from '@/pages/admin/MenuAdmin'
import Settings from '@/pages/admin/Settings'

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
        <Outlet />
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
      <Outlet />
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route element={<FocusLayout />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/track/:orderNumber" element={<Track />} />
              <Route path="/login" element={<Login />} />

              {/* Kitchen display — chef, and admin for oversight. */}
              <Route element={<RequireRole roles={['chef', 'admin']} />}>
                <Route path="/kitchen" element={<Kitchen />} />
              </Route>
            </Route>

            {/* The ONE monitoring dashboard. Admin only, server-enforced. */}
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<LiveOrders />} />
                <Route path="history" element={<History />} />
                <Route path="menu" element={<MenuAdmin />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
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
