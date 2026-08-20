import type { Locale } from "@/lib/i18n";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "p-support"; before: string; link: string; after: string }
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
    updated: "20 de agosto de 2026",
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
            text: "Respecto de los resultados pagados que te entreguemos, recibes una autorización amplia para usarlos con fines personales y comerciales. Ese uso permanece sujeto a los derechos de terceros, a la ley aplicable y a las limitaciones propias del contenido generado con inteligencia artificial.",
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
        title: "7. Uso aceptable y suspensión",
        blocks: [
          {
            type: "p",
            text: "No puedes usar el servicio para fraude, suplantación, explotación, acoso, contenido ilegal, infracción de derechos, evasión de medidas de seguridad ni para dañar el servicio o a terceros. Podemos limitar o suspender el acceso cuando exista evidencia razonable de fraude, abuso, contracargos indebidos, riesgo de seguridad o uso ilegal. Siempre que sea viable, buscaremos aclarar y resolver el caso contigo.",
          },
        ],
      },
      {
        title: "8. Proveedores, disponibilidad y cambios",
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
        title: "9. Responsabilidad y derechos del consumidor",
        blocks: [
          {
            type: "p",
            text: "Respondemos por las obligaciones que no puedan excluirse conforme a la legislación aplicable. En los demás casos, cualquier responsabilidad se evaluará de manera razonable según el servicio afectado y el daño directo comprobable. Nada en estos términos limita derechos irrenunciables de consumidores ni recursos disponibles bajo la legislación mexicana.",
          },
        ],
      },
      {
        title: "10. Soporte y ley aplicable",
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
    updated: "August 20, 2026",
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
            text: "For paid results we deliver to you, you receive a broad authorization to use them for personal and commercial purposes. That use remains subject to third-party rights, applicable law, and the limitations of AI-generated content.",
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
        title: "7. Acceptable use and suspension",
        blocks: [
          {
            type: "p",
            text: "You may not use the service for fraud, impersonation, exploitation, harassment, illegal content, infringement of rights, evasion of security measures, or to harm the service or others. We may limit or suspend access when there is reasonable evidence of fraud, abuse, improper chargebacks, security risk, or illegal use. Whenever practical, we will try to clarify and resolve the case with you.",
          },
        ],
      },
      {
        title: "8. Providers, availability, and changes",
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
        title: "9. Liability and consumer rights",
        blocks: [
          {
            type: "p",
            text: "We remain responsible for obligations that cannot be excluded under applicable law. In other cases, any liability will be assessed reasonably according to the affected service and proven direct damage. Nothing in these terms limits non-waivable consumer rights or remedies available under Mexican law.",
          },
        ],
      },
      {
        title: "10. Support and governing law",
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
