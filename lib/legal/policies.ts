import type { Locale } from "@/lib/i18n";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "p-support"; before: string; link: string; after: string }
  | { type: "p-email"; before: string; after: string }
  | { type: "ul"; items: readonly string[] };

export type LegalSectionCopy = {
  title: string;
  blocks: readonly LegalBlock[];
};

export type LegalPolicyCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  backHome: string;
  updatedPrefix: string;
  sections: readonly LegalSectionCopy[];
};

export const LEGAL_CHROME: Record<
  Locale,
  Pick<LegalPolicyCopy, "backHome" | "updatedPrefix">
> = {
  es: {
    backHome: "Volver al inicio",
    updatedPrefix: "Última actualización:",
  },
  en: {
    backHome: "Back to home",
    updatedPrefix: "Last updated:",
  },
};

export const PAYMENTS_POLICY: Record<Locale, LegalPolicyCopy> = {
  es: {
    metaTitle: "Pagos, Créditos y Reembolsos — Metaprom AI",
    metaDescription:
      "Política de pagos, créditos, cancelaciones y reembolsos de Metaprom AI.",
    eyebrow: "Política de clientes",
    title: "Pagos, Créditos, Cancelaciones y Reembolsos",
    description:
      "Queremos que sepas exactamente cuándo se confirma un pago, cómo se acredita y consume un paquete y qué haremos si no podemos entregar el Comercial Premium que compraste.",
    updated: "20 de agosto de 2026",
    ...LEGAL_CHROME.es,
    sections: [
      {
        title: "1. Paquetes prepagados",
        blocks: [
          {
            type: "p",
            text: "Metaprom AI vende actualmente paquetes prepagados de comerciales e imágenes publicitarias. No son suscripciones y no generan cobros periódicos. Antes de pagar verás el producto, cantidad, precio total y moneda aplicables; para el lanzamiento en México los precios se muestran en pesos mexicanos (MXN).",
          },
        ],
      },
      {
        title: "2. Confirmación de tarjeta y OXXO",
        blocks: [
          {
            type: "p",
            text: "En pagos con tarjeta, el saldo se acredita cuando el procesador confirma el pago y Metaprom AI registra esa confirmación. Una pantalla de regreso o redirección, por sí sola, no sustituye la confirmación canónica.",
          },
          {
            type: "p",
            text: "En OXXO, generar un voucher, referencia o instrucción de pago sólo inicia el proceso. No significa que el dinero haya sido recibido. El pago puede permanecer pendiente mientras OXXO y Stripe lo procesan, y los créditos se agregan únicamente después de recibir la confirmación canónica. Una referencia vencida, cancelada o no pagada no genera saldo.",
          },
        ],
      },
      {
        title: "3. Saldo, vigencia y consumo",
        blocks: [
          {
            type: "p",
            text: "Puedes consultar tu saldo en la sección Mis Créditos. Los paquetes comprados no vencen y permanecen disponibles hasta que los uses.",
          },
          {
            type: "p",
            text: "Una unidad de imágenes publicitarias se consume al guardar por primera vez una nueva pieza terminada. Una unidad de comerciales se consume para producir un nuevo comercial terminado conforme al flujo aplicable. Los ajustes razonables del mismo proyecto no deben consumir otra unidad; un cambio de producto, servicio, campaña o concepto creativo puede considerarse un proyecto nuevo.",
          },
        ],
      },
      {
        title: "4. Pagos fallidos, pendientes o duplicados",
        blocks: [
          {
            type: "p-support",
            before:
              "Si el pago falla, expira o se cancela, no se acredita saldo. Si aparece pendiente, espera la confirmación antes de repetirlo. Si crees que pagaste dos veces o que un cargo no corresponde, usa el ",
            link: "formulario de Soporte",
            after:
              " con el correo de tu cuenta y la referencia disponible. Revisaremos el registro del proveedor y el historial de acreditación para corregir duplicidades reales.",
          },
        ],
      },
      {
        title: "5. Comercial Premium: producto terminado y garantía de entrega",
        blocks: [
          {
            type: "p",
            text: "En un Comercial Premium no te vendemos una generación de IA. Compras un comercial publicitario terminado dentro del alcance del servicio contratado. La IA es sólo una parte del proceso de producción de Metaprom AI.",
          },
          {
            type: "p",
            text: "Una generación de IA que no funciona, por sí sola, no es una entrega.",
          },
          {
            type: "p",
            text: "Si una generación no funciona, Metaprom AI continúa la producción y la corrección dentro de ese alcance hasta entregarte un Comercial Premium a tu satisfacción.",
          },
          {
            type: "p",
            text: "Si Metaprom AI no puede entregar un Comercial Premium satisfactorio dentro del alcance contratado, se reembolsará el pago correspondiente al método de pago original.",
          },
          {
            type: "p",
            text: "Esta garantía no cubre cancelación por tu parte, abandono del proyecto, cambios del producto o del alcance solicitado, ni un cambio de idea después de una entrega ya satisfactoria. Tampoco incluye conceptos ilimitados, cambios de alcance ilimitados ni revisiones ilimitadas ajenas a corregir o terminar el producto comprado.",
          },
        ],
      },
      {
        title: "6. Otras cancelaciones y reembolsos",
        blocks: [
          {
            type: "p-support",
            before: "Puedes pedir ayuda o cancelación a través del ",
            link: "formulario de Soporte",
            after:
              ". Revisaremos de buena fe solicitudes por cargos duplicados, pagos acreditados incorrectamente, fallas atribuibles al servicio distintas de la garantía del Comercial Premium y otras circunstancias razonables.",
          },
          {
            type: "p",
            text: "Cuando corresponda en esos otros casos, podremos corregir el resultado, reponer una unidad o realizar un reembolso al método de pago original. Consideraremos si el paquete o la unidad ya se utilizó, la naturaleza del problema y la evidencia disponible. No rechazaremos derechos o reembolsos que sean obligatorios conforme a la legislación de protección al consumidor aplicable.",
          },
          {
            type: "p",
            text: "Los tiempos para que un reembolso aparezca dependen del procesador y de la institución de pago. Te informaremos la resolución y, cuando exista, la referencia de la devolución.",
          },
        ],
      },
      {
        title: "7. Fraude, contracargos y abuso",
        blocks: [
          {
            type: "p",
            text: "Podemos pausar acreditaciones o acceso cuando existan señales razonables de fraude, uso no autorizado, manipulación, duplicidad intencional, contracargos abusivos o actividad ilegal. Esto no impide que reportes un cargo legítimamente desconocido ni limita tus derechos como consumidor. Nuestro objetivo será aclarar el caso y evitar cobros o consumos incorrectos.",
          },
        ],
      },
      {
        title: "8. Soporte directo",
        blocks: [
          {
            type: "p-support",
            before: "Usa el ",
            link: "formulario de Soporte",
            after:
              " con el correo de tu cuenta, fecha aproximada, importe, método de pago y cualquier referencia visible. No envíes números completos de tarjeta, contraseñas ni códigos de seguridad. Buscaremos una resolución clara, directa y razonable.",
          },
        ],
      },
    ],
  },
  en: {
    metaTitle: "Payments, Credits, and Refunds — Metaprom AI",
    metaDescription:
      "Metaprom AI policy for payments, credits, cancellations, and refunds.",
    eyebrow: "Customer policy",
    title: "Payments, Credits, Cancellations, and Refunds",
    description:
      "We want you to know exactly when a payment is confirmed, how a package is credited and used, and what we will do if we cannot deliver the Premium Commercial you purchased.",
    updated: "August 20, 2026",
    ...LEGAL_CHROME.en,
    sections: [
      {
        title: "1. Prepaid packages",
        blocks: [
          {
            type: "p",
            text: "Metaprom AI currently sells prepaid packages of commercials and advertising images. They are not subscriptions and do not create recurring charges. Before you pay, you will see the applicable product, quantity, total price, and currency; for the Mexico launch, prices are shown in Mexican pesos (MXN).",
          },
        ],
      },
      {
        title: "2. Card confirmation and OXXO",
        blocks: [
          {
            type: "p",
            text: "For card payments, balance is credited when the processor confirms the payment and Metaprom AI records that confirmation. A return screen or redirect, by itself, does not replace canonical confirmation.",
          },
          {
            type: "p",
            text: "With OXXO, generating a voucher, reference, or payment instruction only starts the process. It does not mean the money has been received. Payment may remain pending while OXXO and Stripe process it, and credits are added only after canonical confirmation. An expired, cancelled, or unpaid reference does not add balance.",
          },
        ],
      },
      {
        title: "3. Balance, validity, and use",
        blocks: [
          {
            type: "p",
            text: "You can check your balance in My Credits. Purchased packages do not expire and remain available until you use them.",
          },
          {
            type: "p",
            text: "One advertising-image unit is used the first time a new finished piece is saved. One commercial unit is used to produce a new finished commercial under the applicable flow. Reasonable adjustments to the same project should not use another unit; a change of product, service, campaign, or creative concept may be treated as a new project.",
          },
        ],
      },
      {
        title: "4. Failed, pending, or duplicate payments",
        blocks: [
          {
            type: "p-support",
            before:
              "If a payment fails, expires, or is cancelled, no balance is credited. If it appears pending, wait for confirmation before trying again. If you believe you paid twice or a charge is incorrect, use the ",
            link: "Support form",
            after:
              " with your account email and any available reference. We will review the provider record and credit history to correct genuine duplicates.",
          },
        ],
      },
      {
        title: "5. Premium Commercial: finished product and delivery guarantee",
        blocks: [
          {
            type: "p",
            text: "A Premium Commercial is not the sale of an AI generation. You are purchasing a finished advertising commercial within the scope of the service you purchased. AI is only one part of Metaprom AI's production process.",
          },
          {
            type: "p",
            text: "A failed AI generation, by itself, is not delivery.",
          },
          {
            type: "p",
            text: "If a generation does not work, Metaprom AI continues production and correction within that scope until we deliver a Premium Commercial you are satisfied with.",
          },
          {
            type: "p",
            text: "If Metaprom AI cannot deliver a satisfactory Premium Commercial within the purchased scope, the corresponding payment will be refunded to the original payment method.",
          },
          {
            type: "p",
            text: "This guarantee does not cover cancellation by you, abandoning the project, changing the requested product or scope, or changing your mind after a satisfactory delivery. It also does not include unlimited concepts, unlimited scope changes, or unlimited revisions unrelated to correcting or finishing the purchased product.",
          },
        ],
      },
      {
        title: "6. Other cancellations and refunds",
        blocks: [
          {
            type: "p-support",
            before: "You can request help or cancellation through the ",
            link: "Support form",
            after:
              ". We will review in good faith requests about duplicate charges, incorrectly credited payments, service failures other than the Premium Commercial guarantee above, and other reasonable circumstances.",
          },
          {
            type: "p",
            text: "When those other cases warrant it, we may correct the result, restore a unit, or issue a refund to the original payment method. We will consider whether the package or unit was already used, the nature of the issue, and the available evidence. We will not refuse rights or refunds that are mandatory under applicable consumer-protection law.",
          },
          {
            type: "p",
            text: "How long a refund takes to appear depends on the processor and the payment institution. We will tell you the resolution and, when there is one, the refund reference.",
          },
        ],
      },
      {
        title: "7. Fraud, chargebacks, and abuse",
        blocks: [
          {
            type: "p",
            text: "We may pause credits or access when there are reasonable signs of fraud, unauthorized use, manipulation, intentional duplication, abusive chargebacks, or illegal activity. This does not stop you from reporting a genuinely unrecognized charge or limit your rights as a consumer. Our aim is to clarify the case and prevent incorrect charges or consumption.",
          },
        ],
      },
      {
        title: "8. Direct support",
        blocks: [
          {
            type: "p-support",
            before: "Use the ",
            link: "Support form",
            after:
              " with your account email, approximate date, amount, payment method, and any visible reference. Do not send full card numbers, passwords, or security codes. We will look for a clear, direct, and reasonable resolution.",
          },
        ],
      },
    ],
  },
};

export const TERMS_POLICY: Record<Locale, LegalPolicyCopy> = {
  es: {
    metaTitle: "Términos y Condiciones — Metaprom AI",
    metaDescription: "Términos aplicables al uso de Metaprom AI en México.",
    eyebrow: "Información legal",
    title: "Términos y Condiciones",
    description:
      "Estas condiciones explican de forma directa cómo funciona Metaprom AI, qué puedes esperar del servicio y qué necesitamos de ti para crear contenido de manera responsable.",
    updated: "22 de agosto de 2026",
    ...LEGAL_CHROME.es,
    sections: [
      {
        title: "1. Servicio y aceptación",
        blocks: [
          {
            type: "p",
            text: "Metaprom AI es un servicio digital que utiliza inteligencia artificial y proveedores tecnológicos para ayudar a crear imágenes, videos y otros materiales publicitarios. Al acceder, crear una cuenta o usar el servicio aceptas estos términos y nuestro Aviso de Privacidad.",
          },
          {
            type: "p",
            text: "El servicio está dirigido inicialmente a personas y negocios en México. No somos una agencia legal, fiscal ni de propiedad intelectual y los resultados no sustituyen asesoría profesional.",
          },
        ],
      },
      {
        title: "2. Cuenta y acceso",
        blocks: [
          {
            type: "p-support",
            before:
              "Puedes iniciar sesión mediante un proveedor de identidad, actualmente Google. Eres responsable de mantener seguro el acceso a tu cuenta y de que los datos asociados sean correctos. Avísanos a través del ",
            link: "formulario de Soporte",
            after: " si detectas un acceso no autorizado.",
          },
        ],
      },
      {
        title: "3. Material que subes",
        blocks: [
          {
            type: "p",
            text: "Conservas los derechos que ya tengas sobre fotografías, logotipos, marcas, textos y demás material preexistente que subas. Metaprom AI no adquiere la propiedad de ese material por el solo hecho de que lo uses en el servicio.",
          },
          {
            type: "p",
            text: "Declaras que cuentas con derechos, licencias y permisos suficientes para subirlo y procesarlo, incluidos los permisos necesarios respecto de marcas y personas identificables, su imagen, voz o datos, cuando correspondan. No debes subir material ilegal, engañoso, abusivo, invasivo de privacidad o que infrinja derechos de terceros.",
          },
          {
            type: "p",
            text: "No debes subir fotografías, imágenes, voz, datos personales ni otro contenido identificable de menores de edad para generación u otro uso en el servicio.",
          },
          {
            type: "p",
            text: "Al subir material, otorgas a Metaprom AI una licencia limitada, no exclusiva y revocable en la medida que permita la operación del servicio, únicamente para procesar ese material y producir los resultados que solicites, incluidos almacenamiento, generación, entrega y las funciones de Share que tú actives.",
          },
        ],
      },
      {
        title: "4. Previews gratuitos",
        blocks: [
          {
            type: "p",
            text: "Cuando solicitas o recibes un preview gratuito, autorizas a Metaprom AI, de forma amplia, gratuita y no exclusiva, a procesar, almacenar, reproducir, mostrar, comunicar y usar el preview resultante para operar, demostrar, promover y comercializar Metaprom AI, incluso en nuestro sitio, redes sociales, presentaciones y publicidad.",
          },
          {
            type: "p",
            text: "Esta autorización no transfiere la propiedad de tu material preexistente y siempre está sujeta a los derechos de privacidad, imagen y personalidad aplicables y a los consentimientos que exija la ley. Los previews gratuitos pueden incluir la marca o marca de agua de Metaprom AI y estar sujetos a las restricciones de descarga y uso compartido disponibles en el producto.",
          },
          {
            type: "p-support",
            before: "Si tienes una inquietud legítima sobre un uso promocional, usa el ",
            link: "formulario de Soporte",
            after: " para revisarla directamente.",
          },
        ],
      },
      {
        title: "5. Resultados pagados, producción y uso comercial",
        blocks: [
          {
            type: "p",
            text: "Respecto de los resultados pagados que te entreguemos, recibes una autorización amplia para usarlos con fines personales y comerciales. Ese uso permanece sujeto a los derechos de terceros, a la ley aplicable y a las limitaciones propias del contenido generado con inteligencia artificial. El resultado generado con inteligencia artificial puede no ser único.",
          },
          {
            type: "p",
            text: "Durante la producción de un Comercial Premium, Metaprom AI asume el riesgo de producción dentro del alcance del servicio contratado. No te vendemos un intento de generación de IA. Una generación fallida no se convierte en tu problema por el solo hecho de que la inteligencia artificial pueda cometer errores. Seguimos trabajando dentro de ese alcance; si no podemos entregar un Comercial Premium satisfactorio, el pago correspondiente se reembolsa conforme a la Política de Pagos, Créditos, Cancelaciones y Reembolsos.",
          },
          {
            type: "p",
            text: "Eso no implica conceptos ilimitados, cambios de alcance ilimitados ni revisiones ilimitadas ajenas a corregir o terminar el producto comprado.",
          },
          {
            type: "p",
            text: "Después de una entrega satisfactoria, eres responsable de revisar el contenido final antes de publicarlo o utilizarlo, y de cómo y dónde lo usas. Esa revisión previa a la publicación no significa que aceptes cualquier resultado que un modelo de IA haya generado durante la producción.",
          },
          {
            type: "p",
            text: "No garantizamos exclusividad, titularidad de derechos de autor, posibilidad de registro ni ausencia absoluta de similitudes con contenido de terceros. Tampoco garantizamos el cumplimiento de políticas de plataformas, aprobación legal o publicitaria, ni resultados de negocio.",
          },
        ],
      },
      {
        title: "6. Paquetes, créditos y pagos",
        blocks: [
          {
            type: "p",
            text: "Los productos actuales son paquetes prepagados, no suscripciones. Los precios y la moneda se muestran antes de pagar. Los saldos comprados no vencen y permanecen disponibles hasta su uso, conforme al comportamiento vigente del producto.",
          },
          {
            type: "p",
            text: "Una unidad se consume cuando se genera y guarda una pieza terminada nueva. Los ajustes razonables que continúan el mismo proyecto no deben consumir otra unidad. Cuando cambia el producto, servicio, campaña o concepto creativo, puede comenzar un proyecto nuevo y consumirse otra unidad.",
          },
          {
            type: "p",
            text: "Los pagos se procesan mediante proveedores externos. En OXXO, crear un voucher o referencia no confirma el pago: el saldo se agrega únicamente después de que recibimos la confirmación canónica del pago. Consulta los detalles en nuestra Política de Pagos, Créditos, Cancelaciones y Reembolsos.",
          },
        ],
      },
      {
        title: "7. Share",
        blocks: [
          {
            type: "p",
            text: "Cuando usas Share, se crea una URL pública. Quien tenga esa URL puede ver la presentación compartida. La presentación pública de Share no expone de forma intencional el correo de tu cuenta ni tu identidad como titular.",
          },
          {
            type: "p",
            text: "Las interacciones con una página Share pueden medirse con analítica de primer partido de Metaprom AI. No debes compartir contenido que no estés autorizado a publicar. Las páginas públicas de Share están configuradas para no ser indexadas por buscadores.",
          },
          {
            type: "p-email",
            before:
              "Si necesitas ayuda con contenido compartido, escribe a ",
            after: ".",
          },
        ],
      },
      {
        title: "8. Uso aceptable y suspensión",
        blocks: [
          {
            type: "p",
            text: "No puedes usar el servicio para fraude, suplantación, explotación, acoso, contenido ilegal, infracción de derechos, evasión de medidas de seguridad ni para dañar el servicio o a terceros. Podemos limitar o suspender el acceso cuando exista evidencia razonable de fraude, abuso, contracargos indebidos, riesgo de seguridad o uso ilegal. Siempre que sea viable, buscaremos aclarar y resolver el caso contigo.",
          },
        ],
      },
      {
        title: "9. Proveedores, disponibilidad y cambios",
        blocks: [
          {
            type: "p",
            text: "Dependemos de servicios de alojamiento, autenticación, almacenamiento, pagos y modelos de inteligencia artificial de terceros. Podemos realizar mantenimiento, cambiar proveedores o ajustar funciones. No prometemos disponibilidad ininterrumpida, pero trabajaremos para restablecer el servicio y resolver fallas razonablemente.",
          },
          {
            type: "p",
            text: "Podemos actualizar estos términos cuando cambien el producto, la ley o nuestras prácticas. Publicaremos la versión vigente y su fecha; si un cambio material requiere otra forma de aviso o consentimiento, la proporcionaremos.",
          },
        ],
      },
      {
        title: "10. Responsabilidad y derechos del consumidor",
        blocks: [
          {
            type: "p",
            text: "Respondemos por las obligaciones que no puedan excluirse conforme a la legislación aplicable. En los demás casos, cualquier responsabilidad se evaluará de manera razonable según el servicio afectado y el daño directo comprobable. Nada en estos términos limita derechos irrenunciables de consumidores ni recursos disponibles bajo la legislación mexicana.",
          },
        ],
      },
      {
        title: "11. Soporte y ley aplicable",
        blocks: [
          {
            type: "p-support",
            before: "Para dudas, correcciones, reembolsos o reclamaciones, usa el ",
            link: "formulario de Soporte",
            after: ". Buscaremos una solución directa y de buena fe.",
          },
          {
            type: "p",
            text: "Estos términos se interpretan conforme a las leyes aplicables en México, sin impedir que una persona consumidora acuda a las autoridades o instancias competentes que le correspondan.",
          },
        ],
      },
    ],
  },
  en: {
    metaTitle: "Terms and Conditions — Metaprom AI",
    metaDescription: "Terms applicable to the use of Metaprom AI in Mexico.",
    eyebrow: "Legal information",
    title: "Terms and Conditions",
    description:
      "These terms explain in plain language how Metaprom AI works, what you can expect from the service, and what we need from you to create content responsibly.",
    updated: "August 22, 2026",
    ...LEGAL_CHROME.en,
    sections: [
      {
        title: "1. Service and acceptance",
        blocks: [
          {
            type: "p",
            text: "Metaprom AI is a digital service that uses artificial intelligence and technology providers to help create images, videos, and other advertising materials. By accessing, creating an account, or using the service, you accept these terms and our Privacy Notice.",
          },
          {
            type: "p",
            text: "The service is initially directed to people and businesses in Mexico. We are not a legal, tax, or intellectual-property agency, and results do not replace professional advice.",
          },
        ],
      },
      {
        title: "2. Account and access",
        blocks: [
          {
            type: "p-support",
            before:
              "You can sign in through an identity provider, currently Google. You are responsible for keeping access to your account secure and for associated details being accurate. Tell us through the ",
            link: "Support form",
            after: " if you detect unauthorized access.",
          },
        ],
      },
      {
        title: "3. Material you upload",
        blocks: [
          {
            type: "p",
            text: "You keep the rights you already have in photographs, logos, trademarks, text, and other preexisting material you upload. Metaprom AI does not acquire ownership of that material merely because you use it in the service.",
          },
          {
            type: "p",
            text: "You represent that you have sufficient rights, licenses, and permissions to upload and process it, including any required permissions for trademarks and identifiable people, their image, voice, or data, when applicable. You must not upload material that is illegal, deceptive, abusive, invasive of privacy, or that infringes third-party rights.",
          },
          {
            type: "p",
            text: "You must not upload photographs, images, voice, personal data, or other identifiable content of minors for generation or any other use in the service.",
          },
          {
            type: "p",
            text: "By uploading material, you grant Metaprom AI a limited, non-exclusive license, revocable to the extent the operation of the service allows, solely to process that material and produce the results you request, including storage, generation, delivery, and any Share functions you enable.",
          },
        ],
      },
      {
        title: "4. Free previews",
        blocks: [
          {
            type: "p",
            text: "When you request or receive a free preview, you authorize Metaprom AI, broadly, royalty-free, and non-exclusively, to process, store, reproduce, display, communicate, and use the resulting preview to operate, demonstrate, promote, and market Metaprom AI, including on our site, social networks, presentations, and advertising.",
          },
          {
            type: "p",
            text: "This authorization does not transfer ownership of your preexisting material and always remains subject to applicable privacy, image, and personality rights and to consents required by law. Free previews may include Metaprom AI branding or watermarks and may be subject to the download and sharing restrictions available in the product.",
          },
          {
            type: "p-support",
            before: "If you have a legitimate concern about a promotional use, use the ",
            link: "Support form",
            after: " so we can review it directly.",
          },
        ],
      },
      {
        title: "5. Paid results, production, and commercial use",
        blocks: [
          {
            type: "p",
            text: "For paid results we deliver to you, you receive a broad authorization to use them for personal and commercial purposes. That use remains subject to third-party rights, applicable law, and the limitations of AI-generated content. AI-generated output may not be unique.",
          },
          {
            type: "p",
            text: "During production of a Premium Commercial, Metaprom AI bears the production risk within the scope of the service purchased. We do not sell you an AI-generation attempt. A failed generation does not become your problem merely because artificial intelligence can make mistakes. We keep working within that scope; if we cannot deliver a satisfactory Premium Commercial, the corresponding payment is refunded under the Payments, Credits, Cancellations, and Refunds Policy.",
          },
          {
            type: "p",
            text: "That does not mean unlimited concepts, unlimited scope changes, or unlimited revisions unrelated to correcting or finishing the purchased product.",
          },
          {
            type: "p",
            text: "After a satisfactory delivery, you remain responsible for reviewing the final content before publishing or using it, and for how and where you use it. That pre-publication review is not the same as accepting whatever an AI model generated during production.",
          },
          {
            type: "p",
            text: "We do not guarantee exclusivity, copyright ownership, registrability, or the complete absence of similarities to third-party content. We also do not guarantee platform-policy compliance, legal or advertising approval, or business results.",
          },
        ],
      },
      {
        title: "6. Packages, credits, and payments",
        blocks: [
          {
            type: "p",
            text: "Current products are prepaid packages, not subscriptions. Prices and currency are shown before you pay. Purchased balances do not expire and remain available until used, according to current product behavior.",
          },
          {
            type: "p",
            text: "A unit is consumed when a new finished piece is generated and saved. Reasonable adjustments that continue the same project should not consume another unit. When the product, service, campaign, or creative concept changes, a new project may begin and another unit may be consumed.",
          },
          {
            type: "p",
            text: "Payments are processed by external providers. With OXXO, creating a voucher or reference does not confirm payment: balance is added only after we receive canonical payment confirmation. See the details in our Payments, Credits, Cancellations, and Refunds Policy.",
          },
        ],
      },
      {
        title: "7. Share",
        blocks: [
          {
            type: "p",
            text: "When you use Share, a public URL is created. Anyone with that URL can view the shared presentation. The public Share presentation does not intentionally expose your account email or your identity as the owner.",
          },
          {
            type: "p",
            text: "Interactions with a Share page may be measured with Metaprom AI first-party analytics. You should not Share content you are not authorized to publish. Public Share pages are configured not to be indexed by search engines.",
          },
          {
            type: "p-email",
            before: "If you need help with shared content, write to ",
            after: ".",
          },
        ],
      },
      {
        title: "8. Acceptable use and suspension",
        blocks: [
          {
            type: "p",
            text: "You may not use the service for fraud, impersonation, exploitation, harassment, illegal content, infringement of rights, evasion of security measures, or to harm the service or others. We may limit or suspend access when there is reasonable evidence of fraud, abuse, improper chargebacks, security risk, or illegal use. Whenever practical, we will try to clarify and resolve the case with you.",
          },
        ],
      },
      {
        title: "9. Providers, availability, and changes",
        blocks: [
          {
            type: "p",
            text: "We depend on third-party hosting, authentication, storage, payments, and artificial-intelligence model services. We may perform maintenance, change providers, or adjust features. We do not promise uninterrupted availability, but we will work to restore the service and reasonably resolve failures.",
          },
          {
            type: "p",
            text: "We may update these terms when the product, the law, or our practices change. We will publish the current version and its date; if a material change requires another form of notice or consent, we will provide it.",
          },
        ],
      },
      {
        title: "10. Liability and consumer rights",
        blocks: [
          {
            type: "p",
            text: "We remain responsible for obligations that cannot be excluded under applicable law. In other cases, any liability will be assessed reasonably according to the affected service and proven direct damage. Nothing in these terms limits non-waivable consumer rights or remedies available under Mexican law.",
          },
        ],
      },
      {
        title: "11. Support and governing law",
        blocks: [
          {
            type: "p-support",
            before: "For questions, corrections, refunds, or claims, use the ",
            link: "Support form",
            after: ". We will look for a direct, good-faith solution.",
          },
          {
            type: "p",
            text: "These terms are interpreted under the laws applicable in Mexico, without preventing a consumer from going to the competent authorities or forums that correspond to them.",
          },
        ],
      },
    ],
  },
};

export const PRIVACY_POLICY: Record<Locale, LegalPolicyCopy> = {
  es: {
    metaTitle: "Aviso de Privacidad — Metaprom AI",
    metaDescription: "Aviso de privacidad de Metaprom AI para México.",
    eyebrow: "Información legal",
    title: "Aviso de Privacidad",
    description:
      "Este aviso describe los datos que trata Metaprom AI, para qué los utiliza y cómo puedes ejercer tus derechos en México.",
    updated: "22 de agosto de 2026",
    ...LEGAL_CHROME.es,
    sections: [
      {
        title: "1. Responsable",
        blocks: [
          {
            type: "p",
            text: "El responsable del tratamiento de los datos personales es Metaprom AI.",
          },
          {
            type: "p-email",
            before:
              "Puedes dirigir preguntas y solicitudes de privacidad a ",
            after: ".",
          },
          {
            type: "p-support",
            before: "También puedes usar el ",
            link: "formulario de Soporte",
            after: ".",
          },
        ],
      },
      {
        title: "2. Datos que tratamos",
        blocks: [
          {
            type: "ul",
            items: [
              "Datos de autenticación, cuenta y sesión: nombre o identificador visible, correo electrónico e identificador de usuario que proporciona el inicio de sesión con Google, y las cookies o el almacenamiento necesarios para mantener tu sesión.",
              "Contenido que subes y resultados generados: fotografías, logotipos, textos, videos y otros archivos, así como las imágenes, videos y demás resultados que produce el servicio y la información del proyecto.",
              "Prompts e instrucciones: el texto que escribes al Director, instrucciones creativas y demás indicaciones usadas para generar contenido.",
              "Metadatos de pago y facturación: producto, importe, moneda, estado, referencia y registros necesarios para acreditar y conciliar pagos. Stripe procesa los datos completos de tarjeta; Metaprom AI no declara almacenarlos.",
              "Identificadores de visitante y adquisición de primer partido: un identificador aleatorio de visitante y una atribución de origen o Share. Estos identificadores no contienen nombre, correo, teléfono ni el contenido de tus prompts.",
              "Referrer y atribución UTM: host de referencia y parámetros UTM cuando llegan con la visita.",
              "Eventos de Share: que se creó o abrió una URL compartida, el canal cuando está disponible y el identificador público del Share, sin el correo de la cuenta ni la identidad del titular.",
              "Comunicaciones de soporte: el nombre, correo, categoría y mensaje que envías, y el seguimiento de la resolución.",
              "Preferencia de idioma: una cookie de primer partido para recordar el idioma de la interfaz.",
            ],
          },
          {
            type: "p",
            text: "La dirección IP puede procesarse de forma efímera, a nivel de solicitud, para seguridad, límites de uso y prevención de abuso. En algunos controles antiabuso conservamos un identificador derivado (un resumen criptográfico), no la IP en texto claro. No almacenamos de forma durable la IP cruda, ni un perfil de dispositivo o navegador, como parte de la analítica de Metaprom AI.",
          },
        ],
      },
      {
        title: "3. Finalidades",
        blocks: [
          {
            type: "ul",
            items: [
              "Crear y administrar tu cuenta, autenticarte y mantener tu sesión.",
              "Recibir instrucciones y archivos; generar, guardar, mostrar, entregar y, si tú lo activas, compartir los resultados que solicites.",
              "Procesar, confirmar y conciliar pagos; administrar paquetes, saldos y consumo; prevenir duplicidades y fraude.",
              "Prestar soporte, corregir errores, atender reembolsos y conservar evidencia de las solicitudes.",
              "Proteger cuentas, investigar abuso, mantener la disponibilidad y diagnosticar fallas.",
              "Medir el uso del producto y la atribución de visitas y Shares con analítica de primer partido de Metaprom AI.",
              "Cumplir obligaciones legales y hacer valer nuestras condiciones.",
            ],
          },
        ],
      },
      {
        title: "4. Medición de primer partido",
        blocks: [
          {
            type: "p",
            text: "Metaprom AI utiliza medición y atribución de primer partido. Usamos una cookie de visitante (mp_vid, 180 días) con un identificador aleatorio y una cookie de adquisición (mp_acq, 30 días) para recordar el origen de la visita y el primer Share abierto, incluidos referrer y UTM cuando existen. También usamos almacenamiento de sesión necesario para autenticación y una cookie de idioma.",
          },
          {
            type: "p",
            text: "Esta medición no accede a conversaciones, contactos o mensajes de WhatsApp. No usamos GA4, Google Tag Manager, Meta Pixel ni TikTok Pixel. Los datos de Facebook Business Suite no forman parte de la analítica de Metaprom AI.",
          },
        ],
      },
      {
        title: "5. Share",
        blocks: [
          {
            type: "p",
            text: "Cuando usas Share, se crea una URL pública. Quien tenga esa URL puede ver la presentación compartida. Esa presentación no expone de forma intencional el correo de tu cuenta ni tu identidad como titular. Las interacciones con la página pueden medirse con la analítica de primer partido descrita arriba. No debes compartir contenido que no estés autorizado a publicar. Las páginas públicas de Share están configuradas para no ser indexadas por buscadores.",
          },
          {
            type: "p-email",
            before:
              "Si necesitas ayuda con contenido compartido, escribe a ",
            after: ".",
          },
        ],
      },
      {
        title: "6. Finalidad promocional de previews gratuitos",
        blocks: [
          {
            type: "p",
            text: "Los previews gratuitos pueden usarse para demostrar, promover y comercializar Metaprom AI en sitios web, redes sociales, presentaciones y publicidad, conforme a la autorización prevista en los Términos. Este uso está sujeto a los derechos de privacidad, imagen y personalidad y a los consentimientos legalmente necesarios.",
          },
          {
            type: "p-support",
            before:
              "Puedes solicitar la revisión o limitación de un uso promocional a través del ",
            link: "formulario de Soporte",
            after:
              ". Evaluaremos la solicitud de buena fe y aplicaremos las restricciones legales que correspondan.",
          },
        ],
      },
      {
        title: "7. Encargados y transferencias",
        blocks: [
          {
            type: "p",
            text: "Podemos encargar tratamiento a categorías de proveedores que apoyan autenticación, alojamiento y almacenamiento, bases de datos, generación de contenido con inteligencia artificial, procesamiento de pagos, entrega de correo de soporte y seguridad.",
          },
          {
            type: "p",
            text: "En el servicio, Google se usa para iniciar sesión y Stripe para procesar pagos. Algunos proveedores pueden operar fuera de México. Procuramos compartir únicamente lo necesario. También podremos comunicar información cuando la ley lo exija, para proteger derechos o atender a una autoridad competente.",
          },
        ],
      },
      {
        title: "8. Conservación",
        blocks: [
          {
            type: "p",
            text: "Conservamos la cuenta, los proyectos, los saldos y el contenido necesario para prestar el servicio mientras la cuenta exista o mientras haga falta para cumplir obligaciones, resolver disputas o proteger la seguridad. Los identificadores de visitante duran hasta 180 días y la atribución de origen o Share hasta 30 días. Algunos controles antiabuso conservan un identificador derivado por hasta 30 días. Las comunicaciones de soporte se conservan el tiempo necesario para atenderlas.",
          },
        ],
      },
      {
        title: "9. Derechos ARCO, revocación y limitación",
        blocks: [
          {
            type: "p-email",
            before:
              "Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, revocar un consentimiento cuando proceda o pedir la limitación de su uso o divulgación. Escribe a ",
            after:
              " o usa el formulario de Soporte, con tu nombre, el correo asociado a la cuenta, el derecho que deseas ejercer, una descripción clara de los datos y la información necesaria para acreditar tu identidad y localizar tu cuenta.",
          },
          {
            type: "p",
            text: "Responderemos dentro de los plazos y bajo las condiciones de la legislación mexicana aplicable. Podremos pedir información adicional para verificar identidad y representación. Algunas solicitudes pueden no proceder cuando exista una obligación legal de conservar información o cuando la excepción esté prevista por ley; explicaremos el motivo.",
          },
        ],
      },
      {
        title: "10. Cambios al aviso",
        blocks: [
          {
            type: "p",
            text: "Publicaremos aquí las modificaciones y la fecha de actualización. Si el cambio es material o la ley requiere otro aviso o consentimiento, lo comunicaremos por un medio apropiado antes de aplicar el nuevo tratamiento.",
          },
        ],
      },
    ],
  },
  en: {
    metaTitle: "Privacy Notice — Metaprom AI",
    metaDescription: "Metaprom AI privacy notice for Mexico.",
    eyebrow: "Legal information",
    title: "Privacy Notice",
    description:
      "This notice describes the data Metaprom AI processes, why it is used, and how you can exercise your rights in Mexico.",
    updated: "August 22, 2026",
    ...LEGAL_CHROME.en,
    sections: [
      {
        title: "1. Controller",
        blocks: [
          {
            type: "p",
            text: "The controller of personal data is Metaprom AI.",
          },
          {
            type: "p-email",
            before: "You can send privacy questions and requests to ",
            after: ".",
          },
          {
            type: "p-support",
            before: "You can also use the ",
            link: "Support form",
            after: ".",
          },
        ],
      },
      {
        title: "2. Data we process",
        blocks: [
          {
            type: "ul",
            items: [
              "Authentication, account, and session data: visible name or identifier, email address, and user identifier provided by Google sign-in, and the cookies or storage needed to keep your session.",
              "Uploaded content and generated results: photographs, logos, text, videos, and other files, as well as the images, videos, and other outputs the service produces and project information.",
              "Prompts and instructions: text you write to Director, creative instructions, and other directions used to generate content.",
              "Payment and billing metadata: product, amount, currency, status, reference, and records needed to credit and reconcile payments. Stripe processes full card data; Metaprom AI does not claim to store it.",
              "First-party visitor and acquisition identifiers: a random visitor identifier and an origin or Share attribution. These identifiers do not contain your name, email, phone number, or prompt content.",
              "Referrer and UTM attribution: referring host and UTM parameters when they arrive with the visit.",
              "Share events: that a shared URL was created or opened, the channel when available, and the public Share identifier, without the account email or owner identity.",
              "Support communications: the name, email, category, and message you send, and follow-up of the resolution.",
              "Language preference: a first-party cookie to remember the interface language.",
            ],
          },
          {
            type: "p",
            text: "IP addresses may be processed ephemerally, at request level, for security, usage limits, and abuse prevention. For some anti-abuse controls we keep a derived identifier (a cryptographic digest), not the raw IP. We do not durably store raw IP, or a device or browser profile, as part of Metaprom AI analytics.",
          },
        ],
      },
      {
        title: "3. Purposes",
        blocks: [
          {
            type: "ul",
            items: [
              "Create and administer your account, authenticate you, and keep your session.",
              "Receive instructions and files; generate, save, display, deliver, and, if you enable it, share the results you request.",
              "Process, confirm, and reconcile payments; administer packages, balances, and consumption; prevent duplicates and fraud.",
              "Provide support, correct errors, handle refunds, and keep evidence of requests.",
              "Protect accounts, investigate abuse, maintain availability, and diagnose failures.",
              "Measure product use and the attribution of visits and Shares with Metaprom AI first-party analytics.",
              "Comply with legal obligations and enforce our terms.",
            ],
          },
        ],
      },
      {
        title: "4. First-party measurement",
        blocks: [
          {
            type: "p",
            text: "Metaprom AI uses first-party measurement and attribution. We use a visitor cookie (mp_vid, 180 days) with a random identifier and an acquisition cookie (mp_acq, 30 days) to remember visit origin and the first Share opened, including referrer and UTM when present. We also use session storage needed for authentication and a language cookie.",
          },
          {
            type: "p",
            text: "This measurement does not access WhatsApp conversations, contacts, or messages. We do not use GA4, Google Tag Manager, Meta Pixel, or TikTok Pixel. Facebook Business Suite data is not part of Metaprom AI analytics.",
          },
        ],
      },
      {
        title: "5. Share",
        blocks: [
          {
            type: "p",
            text: "When you use Share, a public URL is created. Anyone with that URL can view the shared presentation. That presentation does not intentionally expose your account email or your identity as the owner. Interactions with the page may be measured with the first-party analytics described above. You should not Share content you are not authorized to publish. Public Share pages are configured not to be indexed by search engines.",
          },
          {
            type: "p-email",
            before: "If you need help with shared content, write to ",
            after: ".",
          },
        ],
      },
      {
        title: "6. Promotional use of free previews",
        blocks: [
          {
            type: "p",
            text: "Free previews may be used to demonstrate, promote, and market Metaprom AI on websites, social networks, presentations, and advertising, under the authorization in the Terms. This use remains subject to applicable privacy, image, and personality rights and to consents required by law.",
          },
          {
            type: "p-support",
            before:
              "You can request review or limitation of a promotional use through the ",
            link: "Support form",
            after:
              ". We will review the request in good faith and apply the legal restrictions that apply.",
          },
        ],
      },
      {
        title: "7. Processors and transfers",
        blocks: [
          {
            type: "p",
            text: "We may engage categories of providers that support authentication, hosting and storage, databases, AI content generation, payment processing, support-email delivery, and security.",
          },
          {
            type: "p",
            text: "In the service, Google is used for sign-in and Stripe is used to process payments. Some providers may operate outside Mexico. We aim to share only what is necessary. We may also disclose information when the law requires it, to protect rights, or to respond to a competent authority.",
          },
        ],
      },
      {
        title: "8. Retention",
        blocks: [
          {
            type: "p",
            text: "We keep the account, projects, balances, and content needed to provide the service while the account exists or as needed to meet obligations, resolve disputes, or protect security. Visitor identifiers last up to 180 days and origin or Share attribution up to 30 days. Some anti-abuse controls keep a derived identifier for up to 30 days. Support communications are kept as long as needed to handle them.",
          },
        ],
      },
      {
        title: "9. ARCO rights, revocation, and limitation",
        blocks: [
          {
            type: "p-email",
            before:
              "You may request access, rectification, cancellation, or objection to the processing of your data, revoke a consent when applicable, or ask that its use or disclosure be limited. Write to ",
            after:
              " or use the Support form, with your name, the email associated with the account, the right you want to exercise, a clear description of the data, and the information needed to verify your identity and locate your account.",
          },
          {
            type: "p",
            text: "We will respond within the timelines and under the conditions of applicable Mexican law. We may ask for additional information to verify identity and representation. Some requests may not proceed when there is a legal duty to retain information or when an exception is provided by law; we will explain the reason.",
          },
        ],
      },
      {
        title: "10. Changes to this notice",
        blocks: [
          {
            type: "p",
            text: "We will publish changes here with the update date. If a change is material or the law requires another notice or consent, we will communicate it by an appropriate means before applying the new processing.",
          },
        ],
      },
    ],
  },
};
