export const _jsonInvoice = {
  factura: {
    '@' : { version : `1.0.0`, id: `comprobante` },
    '#' : {
      infoTributaria: {
        ambiente: 1,
        tipoEmision: 1,
        razonSocial: 'May or May Not',
        ruc: '1792177758001',
        dirMatriz: '#10 Downing St. London, UK',
        codDoc: String( '01' ),
        estab: String( '001'),
        ptoEmi: String( '001')
      },
      infoAdicional: {
        campoAdicional: [
          {
           '@': { nombre: "Dirección" },
           '#': `#10 Downing St. London, UK`
          },
          {
           '@': { nombre: "Teléfono" },
           '#': `15-01-03-882-7179`
          },
          {
           '@': { nombre: "Email" },
           '#': `pm@gov.uk`
          }
        ]
      }
    }
  }
};

export const dayInvoicing = {
  Day:   27,
  Month: 11,
  Year:  2017,
};

export const fileSpecs = {
  appName: `sri_FacElec`,
  fileNameSuffixXML: `xml`,
  fileNameSuffixSOAP: `soap`,
  fileNamePrefix: 'fac',
}
