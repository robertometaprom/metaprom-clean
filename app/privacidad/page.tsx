import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/legal/LegalPage";
import SupportFormLink from "@/components/legal/SupportFormLink";

export const metadata: Metadata = {
  title: "Aviso de Privacidad — Metaprom AI",
  description: "Aviso de privacidad de Metaprom AI para México.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      eyebrow="Información legal"
      title="Aviso de Privacidad"
      description="Este aviso describe los datos que trata Metaprom AI, para qué los utiliza y cómo puedes ejercer tus derechos en México."
      updated="21 de agosto de 2026"
    >
      <LegalSection title="1. Responsable">
        <p>
          El responsable del tratamiento de los datos personales es Metaprom AI.
        </p>
        <p>
          Puedes dirigir preguntas y solicitudes de privacidad a través del{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>. El domicilio de privacidad deberá completarse cuando se constituya la entidad jurídica definitiva.
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que podemos tratar">
        <ul className="list-disc space-y-2 pl-5">
          <li>Datos de cuenta y contacto, como nombre, correo electrónico, identificador de usuario y datos básicos proporcionados por el proveedor de acceso.</li>
          <li>Solicitudes, instrucciones, prompts y conversaciones con las herramientas creativas.</li>
          <li>Fotografías, logotipos, textos, videos y otros archivos que subas, así como los resultados generados y la información del proyecto.</li>
          <li>Datos transaccionales, como producto, importe, moneda, estado, referencia y registros necesarios para acreditar y conciliar pagos. Stripe procesa los datos completos de tarjeta; Metaprom AI no declara almacenarlos.</li>
          <li>Datos técnicos, de uso y seguridad, como dirección IP, dispositivo, navegador, eventos de diagnóstico, registros de solicitudes, sesión e incidentes.</li>
          <li>Comunicaciones que envíes a soporte y el seguimiento de la resolución.</li>
          <li>Cookies estrictamente necesarias para sesión, seguridad y preferencia de idioma, y cookies de medición de primer partido de Metaprom AI: un identificador anónimo de visitante (180 días) y una atribución de origen/Share (30 días). Estos identificadores son aleatorios, no contienen nombre, correo, teléfono ni contenido privado, y no se usan para publicidad de terceros. No incorporamos GA4, Google Tag Manager ni píxeles de Meta o TikTok. Si más adelante usáramos analítica o publicidad de terceros que requiera consentimiento adicional, actualizaremos la interfaz y este aviso antes de activarla.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades primarias">
        <ul className="list-disc space-y-2 pl-5">
          <li>Crear y administrar tu cuenta, autenticarte y mantener tu sesión.</li>
          <li>Recibir instrucciones y archivos; generar, guardar, mostrar, entregar y compartir los resultados que solicites.</li>
          <li>Procesar, confirmar y conciliar pagos; administrar paquetes, saldos y consumo; prevenir duplicidades y fraude.</li>
          <li>Prestar soporte, corregir errores, atender reembolsos y conservar evidencia de las solicitudes.</li>
          <li>Proteger cuentas, investigar abuso, mantener la disponibilidad y diagnosticar fallas.</li>
          <li>Medir el embudo del producto y la atribución de Shares de Metaprom AI con identificadores seudónimos de primer partido, sin acceder a conversaciones, contactos o mensajes de WhatsApp.</li>
          <li>Cumplir obligaciones legales y hacer valer nuestras condiciones.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Finalidad promocional de previews gratuitos">
        <p>
          Los previews gratuitos pueden usarse para demostrar, promover y comercializar Metaprom AI en sitios web, redes sociales, presentaciones y publicidad, conforme a la autorización prevista en los Términos. Este uso está sujeto a los derechos de privacidad, imagen y personalidad y a los consentimientos legalmente necesarios.
        </p>
        <p>
          Puedes solicitar la revisión o limitación de un uso promocional a través del{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>. Evaluaremos la solicitud de buena fe y aplicaremos las restricciones legales que correspondan.
        </p>
      </LegalSection>

      <LegalSection title="5. Proveedores y transferencias">
        <p>
          Podemos encargar tratamiento o compartir datos necesarios con categorías de proveedores que apoyan autenticación, nube y almacenamiento, bases de datos, generación de contenido con inteligencia artificial, procesamiento de pagos, seguridad, entrega de medios y soporte. Entre los proveedores visibles en el servicio se encuentran Google para acceso y Stripe para pagos.
        </p>
        <p>
          Algunos proveedores pueden operar fuera de México. Procuramos compartir únicamente lo necesario y usar medidas contractuales y de seguridad apropiadas. También podremos comunicar información cuando la ley lo exija, para proteger derechos o atender a una autoridad competente.
        </p>
      </LegalSection>

      <LegalSection title="6. Conservación y seguridad">
        <p>
          Conservamos los datos durante el tiempo necesario para prestar el servicio, mantener proyectos y saldos, cumplir obligaciones, resolver disputas y proteger la seguridad. Los borradores anónimos pueden tener periodos más cortos que los proyectos guardados en una cuenta. Aplicamos medidas administrativas, técnicas y organizativas razonables, aunque ningún sistema es completamente infalible.
        </p>
      </LegalSection>

      <LegalSection title="7. Derechos ARCO, revocación y limitación">
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, revocar un consentimiento cuando proceda o pedir la limitación de su uso o divulgación. Envía tu solicitud por el{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>{" "}
          con tu nombre, el correo asociado a la cuenta, el derecho que deseas ejercer, una descripción clara de los datos y la información necesaria para acreditar tu identidad y localizar tu cuenta.
        </p>
        <p>
          Responderemos dentro de los plazos y bajo las condiciones de la legislación mexicana aplicable. Podremos pedir información adicional para verificar identidad y representación. Algunas solicitudes pueden no proceder cuando exista una obligación legal de conservar información o cuando la excepción esté prevista por ley; explicaremos el motivo.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios al aviso">
        <p>
          Publicaremos aquí las modificaciones y la fecha de actualización. Si el cambio es material o la ley requiere otro aviso o consentimiento, lo comunicaremos por un medio apropiado antes de aplicar el nuevo tratamiento.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
