import {
  CARD_PAYMENT_MARK_IDS,
  PAYMENT_MARKS,
  type PaymentMarkId,
} from "@/lib/payment-marks";
import { PRICING_PAGE_COPY } from "@/lib/pricing";

type PaymentMethodsProps = {
  showOxxoPay: boolean;
};

const CARD_STYLE = { minHeight: 120 };

function PaymentMark({ id }: { id: PaymentMarkId }) {
  const mark = PAYMENT_MARKS[id];
  return (
    <img
      src={mark.src}
      alt={mark.alt}
      width={mark.width}
      height={mark.height}
      draggable={false}
      decoding="async"
      className="block object-contain"
      style={mark.style}
    />
  );
}

export default function PaymentMethods({ showOxxoPay }: PaymentMethodsProps) {
  const markIds: PaymentMarkId[] = showOxxoPay
    ? [...CARD_PAYMENT_MARK_IDS, "oxxo"]
    : [...CARD_PAYMENT_MARK_IDS];

  const logoGrid = showOxxoPay
    ? "mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    : "mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      aria-labelledby="payment-methods"
      data-payment-market={showOxxoPay ? "mx" : "intl"}
      className="mt-14 border-t border-white/10 pt-10 md:mt-20"
    >
      <h2
        id="payment-methods"
        className="text-xl font-semibold tracking-tight text-[#F5F5F0] md:text-2xl"
      >
        {PRICING_PAGE_COPY.paymentMethods.title}
      </h2>
      <ul className={logoGrid}>
        {markIds.map((id) => (
          <li
            key={id}
            className="flex min-w-0 items-center justify-center border border-white/10 bg-white/[0.02] px-4 py-6"
            style={CARD_STYLE}
          >
            <PaymentMark id={id} />
          </li>
        ))}
      </ul>
      <p className="mt-3 border border-white/10 bg-white/[0.02] px-4 py-3.5 text-center text-sm leading-snug text-white/65">
        {PRICING_PAGE_COPY.paymentMethods.stripeLabel}
      </p>
    </section>
  );
}
