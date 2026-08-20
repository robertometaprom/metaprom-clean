import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/legal/LegalPage";
import SupportFormLink from "@/components/legal/SupportFormLink";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Metaprom AI",
  description: "Términos aplicables al uso de Metaprom AI en México.",
};

export default function TerminosPage() {
  return (
    <LegalPage
      eyebrow="Información legal"
      title="Términos y Condiciones"
      description="Estas condiciones explican de forma directa cómo funciona Metaprom AI, qué puedes esperar del servicio y qué necesitamos de ti para crear contenido de manera responsable."
      updated="13 de agosto de 2026"
    >
      <LegalSection title="1. Servicio y aceptación">
        <p>
          Metaprom AI es un servicio digital que utiliza inteligencia artificial y proveedores tecnológicos para ayudar a crear imágenes, videos y otros materiales publicitarios. Al acceder, crear una cuenta o usar el servicio aceptas estos términos y nuestro Aviso de Privacidad.
        </p>
        <p>
          El servicio está dirigido inicialmente a personas y negocios en México. No somos una agencia legal, fiscal ni de propiedad intelectual y los resultados no sustituyen asesoría profesional.
        </p>
      </LegalSection>

      <LegalSection title="2. Cuenta y acceso">
        <p>
          Puedes iniciar sesión mediante un proveedor de identidad, actualmente Google. Eres responsable de mantener seguro el acceso a tu cuenta y de que los datos asociados sean correctos. Avísanos a través del{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink> si detectas un acceso no autorizado.
        </p>
      </LegalSection>

      <LegalSection title="3. Material que subes">
        <p>
          Conservas los derechos que ya tengas sobre fotografías, logotipos, marcas, textos y demás material preexistente que subas. Metaprom AI no adquiere la propiedad de ese material por el solo hecho de que lo uses en el servicio.
        </p>
        <p>
          Declaras que cuentas con derechos, licencias y permisos suficientes para subirlo y procesarlo, incluidos los permisos necesarios respecto de marcas y personas identificables, su imagen, voz o datos, cuando correspondan. No debes subir material ilegal, engañoso, abusivo, invasivo de privacidad o que infrinja derechos de terceros.
        </p>
      </LegalSection>

      <LegalSection title="4. Previews gratuitos">
        <p>
          Cuando solicitas o recibes un preview gratuito, autorizas a Metaprom AI, de forma amplia, gratuita y no exclusiva, a procesar, almacenar, reproducir, mostrar, comunicar y usar el preview resultante para operar, demostrar, promover y comercializar Metaprom AI, incluso en nuestro sitio, redes sociales, presentaciones y publicidad.
        </p>
        <p>
          Esta autorización no transfiere la propiedad de tu material preexistente y siempre está sujeta a los derechos de privacidad, imagen y personalidad aplicables y a los consentimientos que exija la ley. Los previews gratuitos pueden incluir la marca o marca de agua de Metaprom AI y estar sujetos a las restricciones de descarga y uso compartido disponibles en el producto.
        </p>
        <p>
          Si tienes una inquietud legítima sobre un uso promocional, usa el{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink> para revisarla directamente.
        </p>
      </LegalSection>

      <LegalSection title="5. Resultados pagados y uso comercial">
        <p>
          Respecto de los resultados pagados que te entreguemos, recibes una autorización amplia para usarlos con fines personales y comerciales. Ese uso permanece sujeto a los derechos de terceros, a la ley aplicable y a las limitaciones propias del contenido generado con inteligencia artificial.
        </p>
        <p>
          No garantizamos exclusividad, titularidad de derechos de autor, posibilidad de registro ni ausencia absoluta de similitudes con contenido de terceros. Debes revisar cada resultado antes de publicarlo o utilizarlo: la inteligencia artificial puede producir errores, detalles inesperados o contenido que requiera corrección.
        </p>
      </LegalSection>

      <LegalSection title="6. Paquetes, créditos y pagos">
        <p>
          Los productos actuales son paquetes prepagados, no suscripciones. Los precios y la moneda se muestran antes de pagar. Los saldos comprados no vencen y permanecen disponibles hasta su uso, conforme al comportamiento vigente del producto.
        </p>
        <p>
          Una unidad se consume cuando se genera y guarda una pieza terminada nueva. Los ajustes razonables que continúan el mismo proyecto no deben consumir otra unidad. Cuando cambia el producto, servicio, campaña o concepto creativo, puede comenzar un proyecto nuevo y consumirse otra unidad.
        </p>
        <p>
          Los pagos se procesan mediante proveedores externos. En OXXO, crear un voucher o referencia no confirma el pago: el saldo se agrega únicamente después de que recibimos la confirmación canónica del pago. Consulta los detalles en nuestra Política de Pagos, Créditos, Cancelaciones y Reembolsos.
        </p>
      </LegalSection>

      <LegalSection title="7. Uso aceptable y suspensión">
        <p>
          No puedes usar el servicio para fraude, suplantación, explotación, acoso, contenido ilegal, infracción de derechos, evasión de medidas de seguridad ni para dañar el servicio o a terceros. Podemos limitar o suspender el acceso cuando exista evidencia razonable de fraude, abuso, contracargos indebidos, riesgo de seguridad o uso ilegal. Siempre que sea viable, buscaremos aclarar y resolver el caso contigo.
        </p>
      </LegalSection>

      <LegalSection title="8. Proveedores, disponibilidad y cambios">
        <p>
          Dependemos de servicios de alojamiento, autenticación, almacenamiento, pagos y modelos de inteligencia artificial de terceros. Podemos realizar mantenimiento, cambiar proveedores o ajustar funciones. No prometemos disponibilidad ininterrumpida, pero trabajaremos para restablecer el servicio y resolver fallas razonablemente.
        </p>
        <p>
          Podemos actualizar estos términos cuando cambien el producto, la ley o nuestras prácticas. Publicaremos la versión vigente y su fecha; si un cambio material requiere otra forma de aviso o consentimiento, la proporcionaremos.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilidad y derechos del consumidor">
        <p>
          Respondemos por las obligaciones que no puedan excluirse conforme a la legislación aplicable. En los demás casos, cualquier responsabilidad se evaluará de manera razonable según el servicio afectado y el daño directo comprobable. Nada en estos términos limita derechos irrenunciables de consumidores ni recursos disponibles bajo la legislación mexicana.
        </p>
      </LegalSection>

      <LegalSection title="10. Soporte y ley aplicable">
        <p>
          Para dudas, correcciones, reembolsos o reclamaciones, usa el{" "}
          <SupportFormLink>formulario de Soporte</SupportFormLink>. Buscaremos una solución directa y de buena fe.
        </p>
        <p>
          Estos términos se interpretan conforme a las leyes aplicables en México, sin impedir que una persona consumidora acuda a las autoridades o instancias competentes que le correspondan.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
