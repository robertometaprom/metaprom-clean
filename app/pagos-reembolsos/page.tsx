import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/legal/LegalPage";
import SupportFormLink from "@/components/legal/SupportFormLink";

export const metadata: Metadata = {
  title: "Pagos, Créditos y Reembolsos — Metaprom AI",
  description: "Política de pagos, créditos, cancelaciones y reembolsos de Metaprom AI.",
};

export default function PagosReembolsosPage() {
  return (
    <LegalPage
      eyebrow="Política de clientes"
      title="Pagos, Créditos, Cancelaciones y Reembolsos"
      description="Queremos que sepas exactamente cuándo se confirma un pago, cómo se acredita y consume un paquete y qué haremos si algo sale mal."
      updated="13 de agosto de 2026"
    >
      <LegalSection title="1. Paquetes prepagados">
        <p>
          Metaprom AI vende actualmente paquetes prepagados de comerciales e imágenes publicitarias. No son suscripciones y no generan cobros periódicos. Antes de pagar verás el producto, cantidad, precio total y moneda aplicables; para el lanzamiento en México los precios se muestran en pesos mexicanos (MXN).
        </p>
      </LegalSection>

      <LegalSection title="2. Confirmación de tarjeta y OXXO">
        <p>
          En pagos con tarjeta, el saldo se acredita cuando el procesador confirma el pago y Metaprom AI registra esa confirmación. Una pantalla de regreso o redirección, por sí sola, no sustituye la confirmación canónica.
        </p>
        <p>
          En OXXO, generar un voucher, referencia o instrucción de pago sólo inicia el proceso. No significa que el dinero haya sido recibido. El pago puede permanecer pendiente mientras OXXO y Stripe lo procesan, y los créditos se agregan únicamente después de recibir la confirmación canónica. Una referencia vencida, cancelada o no pagada no genera saldo.
        </p>
      </LegalSection>

      <LegalSection title="3. Saldo, vigencia y consumo">
        <p>
          Puedes consultar tu saldo en la sección Mis Créditos. Los paquetes comprados no vencen y permanecen disponibles hasta que los uses.
        </p>
        <p>
          Una unidad de imágenes publicitarias se consume al guardar por primera vez una nueva pieza terminada. Una unidad de comerciales se consume para producir un nuevo comercial terminado conforme al flujo aplicable. Los ajustes razonables del mismo proyecto no deben consumir otra unidad; un cambio de producto, servicio, campaña o concepto creativo puede considerarse un proyecto nuevo.
        </p>
      </LegalSection>

      <LegalSection title="4. Pagos fallidos, pendientes o duplicados">
        <p>
          Si el pago falla, expira o se cancela, no se acredita saldo. Si aparece pendiente, espera la confirmación antes de repetirlo. Si crees que pagaste dos veces o que un cargo no corresponde, usa el{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>{" "}
          con el correo de tu cuenta y la referencia disponible. Revisaremos el registro del proveedor y el historial de acreditación para corregir duplicidades reales.
        </p>
      </LegalSection>

      <LegalSection title="5. Cancelaciones y reembolsos">
        <p>
          Puedes pedir ayuda o cancelación a través del{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>. Revisaremos de buena fe solicitudes por cargos duplicados, pagos acreditados incorrectamente, fallas atribuibles al servicio, resultados que no pudieron entregarse y otras circunstancias razonables.
        </p>
        <p>
          Cuando corresponda, podremos corregir el resultado, reponer una unidad o realizar un reembolso al método de pago original. Consideraremos si el paquete o la unidad ya se utilizó, la naturaleza del problema y la evidencia disponible. No rechazaremos derechos o reembolsos que sean obligatorios conforme a la legislación de protección al consumidor aplicable.
        </p>
        <p>
          Los tiempos para que un reembolso aparezca dependen del procesador y de la institución de pago. Te informaremos la resolución y, cuando exista, la referencia de la devolución.
        </p>
      </LegalSection>

      <LegalSection title="6. Fraude, contracargos y abuso">
        <p>
          Podemos pausar acreditaciones o acceso cuando existan señales razonables de fraude, uso no autorizado, manipulación, duplicidad intencional, contracargos abusivos o actividad ilegal. Esto no impide que reportes un cargo legítimamente desconocido ni limita tus derechos como consumidor. Nuestro objetivo será aclarar el caso y evitar cobros o consumos incorrectos.
        </p>
      </LegalSection>

      <LegalSection title="7. Soporte directo">
        <p>
          Usa el{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>{" "}
          con el correo de tu cuenta, fecha aproximada, importe, método de pago y cualquier referencia visible. No envíes números completos de tarjeta, contraseñas ni códigos de seguridad. Buscaremos una resolución clara, directa y razonable.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
