import signatures_map from "./signatures_map"
const { sign:signer } = require ('pdf-signer-brazil')
const fs = require('fs')
const pdf = require('pdf-page-counter');

export default class PdfSigner{

    certificateAdriano 

    constructor(){
    }

    async signDocument(pdfBuffer,signId){

        const sign = signatures_map[signId]

        const certificateAdriano = {
          value : fs.readFileSync(__dirname+'/signatures/'+sign.signFile), 
          passphrase: sign.password,
        } 

        const data = await pdf(pdfBuffer)
   
        const signedPdf = await signer(pdfBuffer, certificateAdriano.value , certificateAdriano.passphrase, {
          reason: sign.reason,
          email: sign.email,
          location: sign.location,
          signerName: sign.signerName,
          annotationOnPages: [data.numpages-1],
          annotationAppearanceOptions: {
            signatureCoordinates: { left: 20, bottom: 120, right: 190, top: 20 },
            signatureDetails: [
              {
                value: sign.signerName,
                fontSize: 5,
                transformOptions: { rotate: 0, space: 2, tilt: 0, xPos: 0, yPos: 32 },
              },
              {
                value: sign.reason,
                fontSize: 5,
                transformOptions: { rotate: 0, space: 2, tilt: 0, xPos: 0, yPos: 25.4 },
              },
              {
                value: 'Este arquivo foi assinado digitalmente',
                fontSize: 5,
                transformOptions: { rotate: 0, space: 2, tilt: 0, xPos: 0, yPos: 18 },
              },
              {
                value: 'Verifique o arquivo em verificador.iti.gov.br',
                fontSize: 5,
                transformOptions: { rotate: 0, space: 2, tilt: 0, xPos: 0, yPos: 11 },
              },
            ]
          },
        })
        return signedPdf;
    }
}
