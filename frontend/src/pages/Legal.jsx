import { Link } from 'react-router-dom'
import {
  BRAND,
  DELIVERY_FEE_PER_KM,
  MAX_DELIVERY_KM,
  PACKAGING_FEE,
} from '@shared/index'
import { Container, Eyebrow } from '@/components/ui/primitives'

/**
 * Privacy policy and terms (CLAUDE.md §25). Written to describe what the app
 * actually does — every data point listed here is one the code stores or
 * sends. DRAFT: to be reviewed by a lawyer before launch.
 */

const UPDATED = '17 September 2026'

function LegalPage({ eyebrow, title, children }) {
  return (
    <Container className="pt-16 pb-24">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)]">{title}</h1>
      <p className="mt-4 text-[13px] text-muted-foreground">
        Last updated {UPDATED}
      </p>
      <p className="mt-6 max-w-[68ch] rounded-sm bg-badge/60 p-4 text-[13px] text-terracotta-dark">
        Draft — pending legal review.
      </p>
      <div className="mt-10 max-w-[68ch] space-y-10 text-[15px] leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:text-foreground [&_li]:mt-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  )
}

function Contact() {
  return (
    <>
      call {BRAND.phone} ({BRAND.hours}) or write to {BRAND.legalName},{' '}
      {BRAND.address.line1}, {BRAND.address.line2}
    </>
  )
}

export function Privacy() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy policy">
      <section>
        <p>
          {BRAND.legalName} (&ldquo;{BRAND.name}&rdquo;, &ldquo;we&rdquo;) runs
          this website to take and deliver food orders. This page explains what
          we collect, why, who else handles it, and how to ask us to change or
          delete it.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong className="text-foreground">For each order:</strong> your
            name, mobile number, delivery address, landmark, pincode, the map
            pin you drop, any note for the kitchen, the dishes, the amounts, and
            the times the order moved through the kitchen.
          </li>
          <li>
            <strong className="text-foreground">A customer record</strong> keyed
            by your mobile number: your name, the addresses you have used, and
            how many orders you have placed. There is no account and no
            password.
          </li>
          <li>
            <strong className="text-foreground">Phone verification:</strong> we
            text a one-time code to your number. We keep only a scrambled
            (hashed) form of the code, for five minutes.
          </li>
          <li>
            <strong className="text-foreground">Your IP address</strong>, held
            briefly in the server&apos;s memory to limit repeated requests. It
            is not written to our database.
          </li>
          <li>
            <strong className="text-foreground">On your device:</strong> your
            cart and the numbers of orders you placed are kept in your
            browser&apos;s local storage. We use no advertising or analytics
            cookies. Staff who sign in get one sign-in cookie.
          </li>
        </ul>
        <p className="mt-4">
          We never ask for or store card, UPI or bank details. Payment is cash
          on delivery.
        </p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To cook your order, deliver it, and call you about it.</li>
          <li>
            To check that orders come from a real phone number, and to stop fake
            or repeated orders.
          </li>
          <li>To keep records of orders and the cash collected for them.</li>
        </ul>
      </section>

      <section>
        <h2>Who else handles it</h2>
        <ul>
          <li>
            Our kitchen staff and delivery riders see the order details they
            need. Riders see your name, number, address and pin.
          </li>
          <li>
            Our database host (MongoDB Atlas) and server hosts (Railway and
            Cloudflare) store and serve the data on our behalf. The database is
            hosted in Singapore.
          </li>
          <li>
            Our SMS provider receives your mobile number and the code to send.
          </li>
          <li>
            When you search for an address or drop a pin at checkout, the search
            text and the pin&apos;s location are sent to an address-lookup
            service (OpenStreetMap Nominatim), and map images are loaded from
            OpenStreetMap. Fonts are loaded from Google Fonts.
          </li>
        </ul>
        <p className="mt-4">
          We do not sell your data or use it for advertising.
        </p>
      </section>

      <section>
        <h2>Your order number</h2>
        <p className="mt-3">
          Anyone with your order number can open its tracking page, which shows
          the order&apos;s progress, dishes, amounts, your name and delivery
          address (not your phone number). Share it only with people you trust.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p className="mt-3">
          Order and customer records are currently kept until you ask us to
          delete them. Verification codes expire after five minutes; staff
          sign-ins after twelve hours.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p className="mt-3">
          You can ask us what we hold about you, to correct it, or to delete it
          — <Contact />. We may need to keep records of completed orders where
          the law requires it.
        </p>
      </section>
    </LegalPage>
  )
}

export function Terms() {
  return (
    <LegalPage eyebrow="Terms" title="Terms of ordering">
      <section>
        <p>
          These terms apply when you order from {BRAND.name}, run by{' '}
          {BRAND.legalName} (FSSAI {BRAND.fssai}). Placing an order means you
          accept them. How we handle your details is set out in the{' '}
          <Link to="/privacy" className="text-primary underline">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Ordering</h2>
        <ul>
          <li>
            We take orders from {BRAND.orderingHours.open} to{' '}
            {BRAND.orderingHours.lastOrder} (India time).
          </li>
          <li>
            Every order needs a mobile number confirmed with a code we text you,
            and a map pin for the delivery point.
          </li>
          <li>
            We deliver up to {MAX_DELIVERY_KM} km from the kitchen. Beyond{' '}
            {BRAND.deliveryRadiusKm} km we may call you to confirm before
            cooking.
          </li>
          <li>
            A dish can sell out after you order. If it does, we cancel the order
            and tell you why.
          </li>
        </ul>
      </section>

      <section>
        <h2>Prices and payment</h2>
        <ul>
          <li>Prices are in Indian rupees.</li>
          <li>
            Delivery costs ₹{DELIVERY_FEE_PER_KM} for every started kilometre,
            measured in a straight line from the kitchen to your pin. Packaging
            is ₹{PACKAGING_FEE} per order.
          </li>
          <li>
            The total shown at checkout is what you pay. Payment is cash on
            delivery only, to the rider.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cancellations and refunds</h2>
        <ul>
          <li>
            To cancel, call us. We can cancel until the food is ready; after
            that it has been cooked for you and cannot be cancelled.
          </li>
          <li>
            You pay only on delivery, so a cancelled order costs you nothing and
            there is nothing to refund.
          </li>
          <li>
            If something is wrong with a delivered order, call us as soon as you
            can so we can put it right.
          </li>
        </ul>
      </section>

      <section>
        <h2>Food information</h2>
        <ul>
          <li>
            Tell us about allergies in the kitchen note — it is printed on your
            order&apos;s kitchen ticket. Many ingredients are prepared in the
            same kitchen, so we cannot guarantee a dish is free of any allergen.
          </li>
          <li>
            Photos marked &ldquo;Illustrative photo&rdquo; show a similar dish,
            not our exact plate. Nutrition figures are shown only where a dish
            lists them.
          </li>
        </ul>
      </section>

      <section>
        <h2>Contact</h2>
        <p className="mt-3">
          Questions about an order or these terms — <Contact />.
        </p>
      </section>
    </LegalPage>
  )
}
